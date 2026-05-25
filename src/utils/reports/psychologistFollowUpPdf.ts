import type {
    PsychologistDashboardDTO,
    PsychologistDashboardItemDTO,
    QuestionnaireDashboardAggregateDTO
} from '../../services/questionnaires/questionnaires.types';
import {
    formatDateTime,
    normalizeAlertLevel,
    normalizeBackendText,
    normalizeDomainLabel,
    normalizeReviewStatus,
    normalizeSessionStatus
} from '../questionnaires/presentation';
import { drawBarChart, drawHorizontalBarChart, drawLineChart, type ReportChartPoint } from './chartDrawing';
import {
    addBulletList,
    addDataTable,
    addNoticeBox,
    addParagraph,
    addReportCover,
    addSectionTitle,
    createReportContext,
    saveReport
} from './pdfBase';
import { buildAdminReportFileName, formatReportNumber, formatReportPercent } from './reportFormatting';

type PsychologistFollowUpReportOptions = {
    periodLabel: string;
    casePublicId?: string | null;
    domain?: string | null;
    alertLevel?: string | null;
    reviewStatus?: string | null;
    includeAggregates: boolean;
    includeEvaluations: boolean;
    includeCharts: boolean;
};

type PsychologistFollowUpReportPayload = {
    dashboard: PsychologistDashboardDTO;
    options: PsychologistFollowUpReportOptions;
};

function aggregateToChartPoints(
    items: QuestionnaireDashboardAggregateDTO[] | undefined,
    labelResolver: (item: QuestionnaireDashboardAggregateDTO) => string
): ReportChartPoint[] {
    return (items ?? [])
        .map((item) => ({
            label: labelResolver(item),
            value: Number(item.count ?? 0)
        }))
        .filter((point) => point.value > 0);
}

function buildTimelinePoints(items: PsychologistDashboardItemDTO[]): ReportChartPoint[] {
    const grouped = new Map<string, { label: string; sort: number; count: number }>();

    items.forEach((item) => {
        if (!item.processed_at) return;
        const parsed = new Date(item.processed_at);
        if (Number.isNaN(parsed.getTime())) return;
        const periodKey = `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}`;
        const label = new Intl.DateTimeFormat('es-CO', {
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC'
        }).format(parsed);
        const sort = Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1);
        const current = grouped.get(periodKey) ?? { label, sort, count: 0 };
        current.count += 1;
        grouped.set(periodKey, current);
    });

    return [...grouped.values()]
        .sort((left, right) => left.sort - right.sort)
        .map((item) => ({ label: item.label, value: item.count }));
}

function buildEvaluationsPerCasePoints(items: PsychologistDashboardItemDTO[]): ReportChartPoint[] {
    const grouped = new Map<string, number>();
    items.forEach((item) => {
        const label = normalizeBackendText(item.case_public_id, 'Caso sin código público');
        grouped.set(label, (grouped.get(label) ?? 0) + 1);
    });
    return [...grouped.entries()].map(([label, value]) => ({ label, value }));
}

function summarizeDomains(item: PsychologistDashboardItemDTO) {
    const domains = item.domains ?? [];
    if (domains.length === 0) return 'Sin dominios disponibles';
    return domains
        .map((domain) => `${normalizeDomainLabel(domain.domain)} (${formatReportPercent(domain.probability, '0 %')})`)
        .join(' · ');
}

function summarizePermissions(item: PsychologistDashboardItemDTO) {
    const permissions = ['Ver'];
    if (item.can_download_pdf) permissions.push('Descargar PDF');
    if (item.can_review) permissions.push('Revisar');
    return permissions.join(' · ');
}

export function downloadPsychologistFollowUpReportPdf({
    dashboard,
    options
}: PsychologistFollowUpReportPayload) {
    const context = createReportContext('Reporte de seguimiento profesional');
    const items = dashboard.items ?? [];

    addReportCover(context, {
        title: 'Reporte de seguimiento profesional',
        subtitle: 'Resumen de evaluaciones aceptadas y resultados orientativos disponibles para apoyar la revisión profesional.',
        sectionLabel: 'Sección: Evaluaciones recibidas',
        generatedAt: formatDateTime(new Date()),
        metaItems: [
            { label: 'Generado', value: formatDateTime(new Date()) },
            { label: 'Periodo consultado', value: options.periodLabel },
            { label: 'Caso público', value: options.casePublicId?.trim() || 'Todos' },
            { label: 'Gráficas incluidas', value: options.includeCharts ? 'Sí' : 'No' }
        ]
    });

    addSectionTitle(context, 'Resumen general');
    addParagraph(
        context,
        'Este reporte resume las evaluaciones aceptadas por el psicólogo y los resultados orientativos disponibles para apoyar la revisión profesional.'
    );
    addNoticeBox(
        context,
        'Alcance del reporte',
        'Este documento incluye únicamente evaluaciones aceptadas. Las solicitudes pendientes o rechazadas no se mezclan como evaluaciones activas.',
        'info'
    );
    addBulletList(context, [
        `Total de evaluaciones compartidas aceptadas: ${formatReportNumber(dashboard.summary?.total_shared_sessions ?? items.length)}.`,
        `Total de casos: ${formatReportNumber(dashboard.summary?.total_cases ?? 0)}.`,
        `Revisiones pendientes: ${formatReportNumber(dashboard.summary?.pending_reviews ?? 0)}.`,
        `Casos revisados: ${formatReportNumber(dashboard.summary?.reviewed_cases ?? 0)}.`,
        `Casos que requieren revisión profesional: ${formatReportNumber(dashboard.summary?.cases_needing_professional_review ?? 0)}.`,
        `Mayor nivel de alerta: ${normalizeAlertLevel(dashboard.summary?.highest_alert_level)}.`
    ]);

    if (options.includeAggregates) {
        addDataTable(context, {
            title: 'Distribución por dominio',
            description: 'Esta tabla muestra cuántas evaluaciones aceptadas presentan señales por dominio y cuál fue la mayor probabilidad registrada en cada agrupación.',
            head: ['Dominio', 'Cantidad', 'Mayor probabilidad'],
            body: (dashboard.aggregates?.by_domain ?? []).length > 0
                ? (dashboard.aggregates?.by_domain ?? []).map((item) => [
                    normalizeDomainLabel(item.domain),
                    formatReportNumber(item.count ?? 0),
                    item.max_probability !== null && item.max_probability !== undefined ? formatReportPercent(item.max_probability, '--') : '--'
                ])
                : [['Sin agregados disponibles', '--', '--']]
        });

        addDataTable(context, {
            title: 'Distribución por nivel de alerta',
            description: 'Esta tabla resume la cantidad de evaluaciones aceptadas según su nivel de alerta visible.',
            head: ['Nivel de alerta', 'Cantidad'],
            body: (dashboard.aggregates?.by_alert_level ?? []).length > 0
                ? (dashboard.aggregates?.by_alert_level ?? []).map((item) => [
                    normalizeAlertLevel(item.alert_level),
                    formatReportNumber(item.count ?? 0)
                ])
                : [['Sin agregados disponibles', '--']]
        });

        addDataTable(context, {
            title: 'Distribución por estado de revisión',
            description: 'Esta tabla resume cuántas evaluaciones aceptadas se ubican en cada estado de revisión profesional.',
            head: ['Estado de revisión', 'Cantidad'],
            body: (dashboard.aggregates?.by_review_status ?? []).length > 0
                ? (dashboard.aggregates?.by_review_status ?? []).map((item) => [
                    normalizeReviewStatus(item.review_status),
                    formatReportNumber(item.count ?? 0)
                ])
                : [['Sin agregados disponibles', '--']]
        });
    }

    if (options.includeEvaluations) {
        addDataTable(context, {
            title: 'Evaluaciones incluidas',
            description:
                'La siguiente tabla lista las evaluaciones aceptadas incluidas en el reporte, con sus dominios visibles, estado de revisión y permisos disponibles desde la cuenta profesional.',
            head: ['Caso', 'Acudiente', 'Estado', 'Procesado', 'Revisión', 'Dominios', 'Permisos'],
            body: items.length > 0
                ? items.map((item) => [
                    normalizeBackendText(item.case_public_id, 'Caso sin código público'),
                    normalizeBackendText(item.guardian?.display_name, 'Acudiente no disponible'),
                    normalizeSessionStatus(item.status),
                    formatDateTime(item.processed_at),
                    normalizeReviewStatus(item.review_status),
                    summarizeDomains(item),
                    summarizePermissions(item)
                ])
                : [['Sin evaluaciones aceptadas', '--', '--', '--', '--', '--', '--']]
        });
    }

    if (options.includeCharts) {
        const byDomainPoints = aggregateToChartPoints(
            dashboard.aggregates?.by_domain,
            (item) => normalizeDomainLabel(item.domain)
        );
        if (byDomainPoints.length > 0) {
            drawHorizontalBarChart(context, {
                title: 'Evaluaciones por dominio',
                description: 'Esta gráfica resume cuántas evaluaciones aceptadas presentan señales por cada dominio visible.',
                points: byDomainPoints
            });
        } else {
            addNoticeBox(context, 'Evaluaciones por dominio', 'No hay datos suficientes para generar esta gráfica en el periodo seleccionado.', 'info');
        }

        const byAlertPoints = aggregateToChartPoints(
            dashboard.aggregates?.by_alert_level,
            (item) => normalizeAlertLevel(item.alert_level)
        );
        if (byAlertPoints.length > 0) {
            drawBarChart(context, {
                title: 'Distribución por nivel de alerta',
                description: 'Esta gráfica resume cuántas evaluaciones aceptadas caen en cada nivel de alerta visible.',
                points: byAlertPoints
            });
        } else {
            addNoticeBox(context, 'Distribución por nivel de alerta', 'No hay datos suficientes para generar esta gráfica en el periodo seleccionado.', 'info');
        }

        const byReviewStatusPoints = aggregateToChartPoints(
            dashboard.aggregates?.by_review_status,
            (item) => normalizeReviewStatus(item.review_status)
        );
        if (byReviewStatusPoints.length > 0) {
            drawBarChart(context, {
                title: 'Distribución por estado de revisión',
                description: 'Esta gráfica resume el estado actual de revisión profesional sobre las evaluaciones aceptadas.',
                points: byReviewStatusPoints
            });
        } else {
            addNoticeBox(context, 'Distribución por estado de revisión', 'No hay datos suficientes para generar esta gráfica en el periodo seleccionado.', 'info');
        }

        const timelinePoints = buildTimelinePoints(items);
        if (timelinePoints.length >= 2) {
            drawLineChart(context, {
                title: 'Evolución temporal de evaluaciones aceptadas',
                description: 'Esta gráfica muestra cómo evoluciona la cantidad de evaluaciones aceptadas procesadas a lo largo del periodo consultado.',
                points: timelinePoints,
                maxXAxisLabels: 6,
                rotateXAxisLabels: true
            });
        } else {
            addNoticeBox(context, 'Evolución temporal', 'No hay datos suficientes para generar esta gráfica en el periodo seleccionado.', 'info');
        }

        const evaluationsPerCasePoints = buildEvaluationsPerCasePoints(items);
        if (evaluationsPerCasePoints.length > 0) {
            drawHorizontalBarChart(context, {
                title: 'Evaluaciones por caso',
                description: 'Esta gráfica compara cuántas evaluaciones aceptadas están asociadas a cada caso público incluido en el reporte.',
                points: evaluationsPerCasePoints
            });
        } else {
            addNoticeBox(context, 'Evaluaciones por caso', 'No hay datos suficientes para generar esta gráfica en el periodo seleccionado.', 'info');
        }
    }

    addSectionTitle(context, 'Uso profesional del documento');
    addBulletList(context, [
        'Documento de apoyo profesional. No constituye diagnóstico automático.',
        'Debe contrastarse con entrevista, observación clínica y contexto familiar o escolar.',
        'Los permisos visibles en el reporte resumen las acciones habilitadas sobre cada evaluación aceptada.'
    ]);

    saveReport(context, buildAdminReportFileName('Seguimiento profesional'));
}
