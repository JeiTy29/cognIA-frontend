import type {
    GuardianDashboardCaseDTO,
    GuardianDashboardDTO,
    QuestionnaireCaseDetailDTO,
    QuestionnaireCaseTrendPointDTO
} from '../../services/questionnaires/questionnaires.types';
import {
    formatDate,
    formatDateTime,
    formatPercent,
    normalizeAlertLevel,
    normalizeBooleanLabel,
    normalizeCaseStatus,
    normalizeDomainLabel,
    normalizeQuestionnaireMode,
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
import { buildAdminReportFileName, formatReportNumber } from './reportFormatting';

type GuardianFollowUpReportOptions = {
    months?: number | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    caseId?: string | null;
    caseLabel?: string | null;
    includeRecentSessions: boolean;
    includeDomainBreakdown: boolean;
    includeCharts: boolean;
};

type GuardianFollowUpReportPayload = {
    dashboard: GuardianDashboardDTO;
    caseDetails?: QuestionnaireCaseDetailDTO[];
    options: GuardianFollowUpReportOptions;
};

type DomainAggregateRow = {
    domainKey: string;
    domainLabel: string;
    latestProbability: number | null;
    maxProbability: number | null;
    latestAlertLevel: string | null;
};

function resolveCaseLabel(caseEntry: GuardianDashboardCaseDTO['case'] | null | undefined) {
    return caseEntry?.display_label ?? caseEntry?.private_label ?? caseEntry?.case_public_id ?? 'Caso sin etiqueta';
}

function resolvePeriodLabel(dashboard: GuardianDashboardDTO, options: GuardianFollowUpReportOptions) {
    const period = dashboard.period ?? null;
    const dateFrom = options.dateFrom ?? period?.date_from ?? null;
    const dateTo = options.dateTo ?? period?.date_to ?? null;

    if (dateFrom && dateTo) {
        return `Del ${formatDate(dateFrom)} al ${formatDate(dateTo)}`;
    }

    const months = options.months ?? period?.months ?? 3;
    return `Últimos ${months} meses`;
}

function aggregateDomains(cases: GuardianDashboardCaseDTO[]) {
    const aggregate = new Map<string, DomainAggregateRow>();

    for (const caseEntry of cases) {
        for (const domain of caseEntry.domain_breakdown ?? []) {
            const key = String(domain.domain ?? '').trim().toLowerCase();
            if (!key) continue;

            const current = aggregate.get(key) ?? {
                domainKey: key,
                domainLabel: normalizeDomainLabel(domain.domain),
                latestProbability: null,
                maxProbability: null,
                latestAlertLevel: null
            };

            const latestProbability =
                typeof domain.latest_probability === 'number'
                    ? Math.max(current.latestProbability ?? 0, domain.latest_probability)
                    : current.latestProbability;
            const maxProbability =
                typeof domain.max_probability === 'number'
                    ? Math.max(current.maxProbability ?? 0, domain.max_probability)
                    : current.maxProbability;

            aggregate.set(key, {
                ...current,
                latestProbability,
                maxProbability,
                latestAlertLevel: current.latestAlertLevel ?? (domain.latest_alert_level ?? null)
            });
        }
    }

    return [...aggregate.values()].sort((left, right) => (right.latestProbability ?? 0) - (left.latestProbability ?? 0));
}

function buildRecentSessionsRows(caseDetails: QuestionnaireCaseDetailDTO[]) {
    return caseDetails.flatMap((detail) => {
        const caseLabel = resolveCaseLabel(detail.case);
        return (detail.sessions ?? []).slice(0, 3).map((session) => [
            caseLabel,
            formatDateTime(session.processed_at ?? session.updated_at ?? session.created_at),
            normalizeSessionStatus(session.status),
            normalizeQuestionnaireMode(session.mode),
            formatPercent(session.progress_percent ?? session.progress_pct),
            normalizeBooleanLabel(session.result?.needs_professional_review)
        ]);
    });
}

function buildSessionsPerCasePoints(cases: GuardianDashboardCaseDTO[]): ReportChartPoint[] {
    return cases
        .map((caseEntry) => ({
            label: resolveCaseLabel(caseEntry.case),
            value: Number(caseEntry.sessions_count ?? caseEntry.case?.sessions_count ?? 0)
        }))
        .filter((point) => point.value > 0);
}

function buildReviewNeedPoints(cases: GuardianDashboardCaseDTO[]): ReportChartPoint[] {
    const requiringReview = cases.filter((caseEntry) => caseEntry.latest_session?.needs_professional_review).length;
    const withoutReview = Math.max(0, cases.length - requiringReview);
    return [
        { label: 'Requieren revisión', value: requiringReview },
        { label: 'Sin revisión requerida', value: withoutReview }
    ];
}

function buildAlertDistributionPoints(cases: GuardianDashboardCaseDTO[]): ReportChartPoint[] {
    const counts = new Map<string, number>();

    for (const caseEntry of cases) {
        const alert =
            caseEntry.case?.latest_alert_level ??
            caseEntry.latest_session?.domains?.[0]?.alert_level ??
            caseEntry.domain_breakdown?.[0]?.latest_alert_level ??
            null;
        const label = normalizeAlertLevel(alert);
        counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    return [...counts.entries()].map(([label, value]) => ({ label, value }));
}

function buildLatestDomainChartPoints(rows: DomainAggregateRow[]): ReportChartPoint[] {
    return rows
        .filter((row) => row.latestProbability !== null)
        .map((row) => ({
            label: row.domainLabel,
            value: row.latestProbability ?? 0
        }));
}

function buildMaxDomainChartPoints(rows: DomainAggregateRow[]): ReportChartPoint[] {
    return rows
        .filter((row) => row.maxProbability !== null)
        .map((row) => ({
            label: row.domainLabel,
            value: row.maxProbability ?? 0
        }));
}

function buildTrendPointLabel(value: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: 'short',
        timeZone: 'UTC'
    }).format(parsed);
}

function buildTrendCharts(cases: GuardianDashboardCaseDTO[], caseDetails: QuestionnaireCaseDetailDTO[]) {
    const sourceTrends: QuestionnaireCaseTrendPointDTO[] = [];
    caseDetails.forEach((detail) => sourceTrends.push(...(detail.trend ?? [])));
    if (sourceTrends.length === 0) {
        cases.forEach((caseEntry) => sourceTrends.push(...(caseEntry.trend ?? [])));
    }

    const byDomain = new Map<string, Array<{ sort: number; label: string; value: number }>>();
    for (const point of sourceTrends) {
        const sort = point.date ? Date.parse(point.date) : Number.NaN;
        const label = point.date ? buildTrendPointLabel(point.date) : 'Fecha no disponible';
        for (const domain of point.domains ?? []) {
            const value = Number(domain.probability);
            if (!Number.isFinite(value)) continue;
            const domainLabel = normalizeDomainLabel(domain.domain);
            const bucket = byDomain.get(domainLabel) ?? [];
            bucket.push({
                sort: Number.isFinite(sort) ? sort : 0,
                label,
                value
            });
            byDomain.set(domainLabel, bucket);
        }
    }

    return [...byDomain.entries()]
        .map(([domainLabel, points]) => ({
            domainLabel,
            points: points
                .sort((left, right) => left.sort - right.sort)
                .map((point) => ({ label: point.label, value: point.value }))
        }))
        .filter((entry) => entry.points.length >= 2)
        .sort((left, right) => {
            const leftMax = Math.max(...left.points.map((point) => point.value), 0);
            const rightMax = Math.max(...right.points.map((point) => point.value), 0);
            return rightMax - leftMax;
        })
        .slice(0, 3);
}

export function downloadGuardianFollowUpReportPdf({
    dashboard,
    caseDetails = [],
    options
}: GuardianFollowUpReportPayload) {
    const context = createReportContext('Reporte de seguimiento del padre/tutor');
    const includedCases = dashboard.cases ?? [];
    const domainRows = aggregateDomains(includedCases);
    const periodLabel = resolvePeriodLabel(dashboard, options);
    const selectedCaseLabel = options.caseLabel?.trim() || 'Todos los casos';

    addReportCover(context, {
        title: 'Reporte de seguimiento del padre/tutor',
        subtitle: 'Resumen del seguimiento registrado para los casos incluidos y sus resultados orientativos más recientes.',
        sectionLabel: 'Sección: Seguimiento',
        generatedAt: formatDateTime(new Date()),
        metaItems: [
            { label: 'Generado', value: formatDateTime(new Date()) },
            { label: 'Periodo consultado', value: periodLabel },
            { label: 'Casos incluidos', value: selectedCaseLabel },
            { label: 'Gráficas incluidas', value: options.includeCharts ? 'Sí' : 'No' }
        ]
    });

    addSectionTitle(context, 'Resumen general');
    addParagraph(
        context,
        'Este reporte resume el seguimiento del padre o tutor a partir de la información agregada del panel de seguimiento. Los resultados son orientativos y no constituyen diagnóstico clínico.'
    );
    addBulletList(context, [
        `Total de casos: ${formatReportNumber(dashboard.summary?.total_cases ?? includedCases.length)}.`,
        `Total de sesiones: ${formatReportNumber(dashboard.summary?.total_sessions ?? 0)}.`,
        `Sesiones procesadas: ${formatReportNumber(dashboard.summary?.processed_sessions ?? 0)}.`,
        `Casos que requieren revisión profesional: ${formatReportNumber(dashboard.summary?.cases_needing_professional_review ?? 0)}.`,
        `Mayor nivel de alerta: ${normalizeAlertLevel(dashboard.summary?.highest_alert_level)}.`
    ]);

    addDataTable(context, {
        title: 'Casos incluidos',
        description: 'Esta tabla lista los casos contemplados en el periodo consultado y resume su estado visible, sesiones acumuladas y alerta principal más reciente.',
        head: ['Caso', 'Código público', 'Estado', 'Sesiones', 'Última alerta'],
        body: includedCases.map((caseEntry) => [
            resolveCaseLabel(caseEntry.case),
            caseEntry.case?.case_public_id ?? '--',
            normalizeCaseStatus(caseEntry.case?.status),
            formatReportNumber(caseEntry.sessions_count ?? caseEntry.case?.sessions_count ?? 0),
            normalizeAlertLevel(caseEntry.case?.latest_alert_level ?? caseEntry.domain_breakdown?.[0]?.latest_alert_level)
        ])
    });

    if (options.includeDomainBreakdown) {
        addDataTable(context, {
            title: 'Última medición por dominio',
            description:
                'Estos valores corresponden a la última sesión disponible dentro del periodo seleccionado. No representan un promedio histórico. Cuando se incluyen varios casos, la tabla resume el valor más alto observado por dominio entre los casos incluidos.',
            head: ['Dominio', 'Última medición', 'Mayor registrada', 'Alerta actual'],
            body: domainRows.length > 0
                ? domainRows.map((row) => [
                    row.domainLabel,
                    row.latestProbability !== null ? formatPercent(row.latestProbability) : '--',
                    row.maxProbability !== null ? formatPercent(row.maxProbability) : '--',
                    normalizeAlertLevel(row.latestAlertLevel)
                ])
                : [['Sin dominios disponibles', '--', '--', '--']]
        });
    }

    if (options.includeRecentSessions) {
        const recentSessionRows = buildRecentSessionsRows(caseDetails);
        if (recentSessionRows.length > 0) {
            addDataTable(context, {
                title: 'Sesiones recientes por caso',
                description:
                    'La siguiente tabla resume hasta tres sesiones recientes por caso, con estado, modo, progreso y señal de revisión profesional si está disponible.',
                head: ['Caso', 'Fecha', 'Estado', 'Modo', 'Progreso', 'Revisión profesional'],
                body: recentSessionRows
            });
        } else {
            addNoticeBox(
                context,
                'Sesiones recientes por caso',
                'No hay datos suficientes para listar sesiones recientes en el periodo seleccionado.',
                'info'
            );
        }
    }

    if (options.includeCharts) {
        const sessionsPerCase = buildSessionsPerCasePoints(includedCases);
        if (sessionsPerCase.length > 0) {
            drawHorizontalBarChart(context, {
                title: 'Sesiones por caso',
                description: 'Esta gráfica compara cuántas sesiones están asociadas a cada caso dentro del periodo consultado.',
                points: sessionsPerCase
            });
        } else {
            addNoticeBox(context, 'Sesiones por caso', 'No hay datos suficientes para generar esta gráfica en el periodo seleccionado.', 'info');
        }

        const latestDomainPoints = buildLatestDomainChartPoints(domainRows);
        if (latestDomainPoints.length > 0) {
            drawHorizontalBarChart(context, {
                title: 'Última medición por dominio',
                description:
                    'Esta gráfica muestra la última medición observada por dominio dentro de los casos incluidos. La escala siempre se interpreta sobre 100 % para no distorsionar probabilidades bajas.',
                points: latestDomainPoints,
                percent: true
            });
        } else {
            addNoticeBox(context, 'Última medición por dominio', 'No hay datos suficientes para generar esta gráfica en el periodo seleccionado.', 'info');
        }

        const maxDomainPoints = buildMaxDomainChartPoints(domainRows);
        if (maxDomainPoints.length > 0) {
            drawHorizontalBarChart(context, {
                title: 'Mayor registrada por dominio',
                description:
                    'Esta gráfica muestra el valor más alto registrado por dominio dentro de los casos incluidos en el periodo consultado.',
                points: maxDomainPoints,
                percent: true
            });
        } else {
            addNoticeBox(context, 'Mayor registrada por dominio', 'No hay datos suficientes para generar esta gráfica en el periodo seleccionado.', 'info');
        }

        const alertDistribution = buildAlertDistributionPoints(includedCases);
        if (alertDistribution.length > 0) {
            drawBarChart(context, {
                title: 'Distribución por nivel de alerta',
                description: 'Esta gráfica resume cuántos casos se ubican en cada nivel de alerta visible dentro del periodo consultado.',
                points: alertDistribution
            });
        } else {
            addNoticeBox(context, 'Distribución por nivel de alerta', 'No hay datos suficientes para generar esta gráfica en el periodo seleccionado.', 'info');
        }

        const reviewNeedPoints = buildReviewNeedPoints(includedCases);
        if (reviewNeedPoints.some((point) => point.value > 0)) {
            drawBarChart(context, {
                title: 'Casos que requieren revisión profesional',
                description: 'Esta gráfica compara los casos que requieren revisión profesional frente a los que no muestran esa necesidad en el periodo consultado.',
                points: reviewNeedPoints
            });
        } else {
            addNoticeBox(context, 'Casos que requieren revisión profesional', 'No hay datos suficientes para generar esta gráfica en el periodo seleccionado.', 'info');
        }

        const trendCharts = buildTrendCharts(includedCases, caseDetails);
        if (trendCharts.length > 0) {
            trendCharts.forEach((trendChart) => {
                drawLineChart(context, {
                    title: `Tendencia temporal de ${trendChart.domainLabel}`,
                    description:
                        'Esta gráfica resume cómo evolucionan las mediciones disponibles para el dominio dentro del periodo consultado. Debe interpretarse como seguimiento orientativo, no como diagnóstico.',
                    points: trendChart.points,
                    percent: true,
                    maxXAxisLabels: 6,
                    rotateXAxisLabels: true
                });
            });
        } else {
            addNoticeBox(context, 'Tendencia temporal por dominio', 'No hay datos suficientes para generar esta gráfica en el periodo seleccionado.', 'info');
        }
    }

    addSectionTitle(context, 'Aclaraciones de interpretación');
    addBulletList(context, [
        'Los porcentajes representan mediciones orientativas del sistema y no reemplazan valoración profesional.',
        'Cuando se incluyen varios casos, las gráficas por dominio resumen los valores observados entre los casos contemplados en el reporte.',
        'El historial y los reportes asociados a cada caso permanecen disponibles aunque el caso se archive.'
    ]);

    saveReport(context, buildAdminReportFileName('Seguimiento padre tutor'));
}
