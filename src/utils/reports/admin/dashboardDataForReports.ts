import {
    getDashboardAdoptionHistoryBlock,
    getDashboardApiHealth,
    getDashboardDataQuality,
    getDashboardDrift,
    getDashboardEquity,
    getDashboardExecutiveSummary,
    getDashboardFunnel,
    getDashboardHumanReview,
    getDashboardModelMonitoring,
    getDashboardQuestionnaireQuality,
    getDashboardQuestionnaireVolume,
    getDashboardRetention,
    getDashboardUserGrowth
} from '../../../services/dashboard/dashboard.api';
import type {
    DashboardAdoptionHistoryResponse,
    DashboardFunnelResponse,
    DashboardSeriesResponse
} from '../../../services/dashboard/dashboard.types';
import { extractDashboardSeries } from '../dashboardSeries';
import { formatReportNumber, formatReportPercent, humanizeDashboardLabel, sanitizeTechnicalValue } from '../reportFormatting';

export type ReportDashboardBlockKey =
    | 'executiveSummary'
    | 'adoptionHistory'
    | 'funnel'
    | 'humanReview'
    | 'userGrowth'
    | 'questionnaireVolume'
    | 'questionnaireQuality'
    | 'apiHealth'
    | 'dataQuality'
    | 'drift'
    | 'equity'
    | 'modelMonitoring'
    | 'retention';

type DashboardBlockValue =
    | DashboardSeriesResponse
    | DashboardFunnelResponse
    | DashboardAdoptionHistoryResponse;

const dashboardLoaders: Record<ReportDashboardBlockKey, (months?: number) => Promise<DashboardBlockValue>> = {
    executiveSummary: getDashboardExecutiveSummary,
    adoptionHistory: getDashboardAdoptionHistoryBlock,
    funnel: getDashboardFunnel,
    humanReview: getDashboardHumanReview,
    userGrowth: getDashboardUserGrowth,
    questionnaireVolume: getDashboardQuestionnaireVolume,
    questionnaireQuality: getDashboardQuestionnaireQuality,
    apiHealth: getDashboardApiHealth,
    dataQuality: getDashboardDataQuality,
    drift: getDashboardDrift,
    equity: getDashboardEquity,
    modelMonitoring: getDashboardModelMonitoring,
    retention: getDashboardRetention
};

function isSeriesBlock(payload: DashboardBlockValue): payload is DashboardSeriesResponse {
    return 'series' in payload;
}

function isFunnelBlock(payload: DashboardBlockValue): payload is DashboardFunnelResponse {
    return 'created' in payload || 'submitted' in payload || 'processed' in payload;
}

export async function loadDashboardBlocksForReport(keys: ReportDashboardBlockKey[], months = 12) {
    const uniqueKeys = Array.from(new Set(keys));
    const settled = await Promise.allSettled(
        uniqueKeys.map(async (key) => ({
            key,
            value: await dashboardLoaders[key](months)
        }))
    );

    const data: Partial<Record<ReportDashboardBlockKey, DashboardBlockValue>> = {};
    const failedKeys: ReportDashboardBlockKey[] = [];

    for (const result of settled) {
        if (result.status === 'fulfilled') {
            data[result.value.key] = result.value.value;
        } else {
            const index = settled.indexOf(result);
            failedKeys.push(uniqueKeys[index]);
        }
    }

    return {
        data,
        failedKeys
    };
}

function flattenNode(prefix: string, value: unknown, rows: Array<[string, string]>) {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
        const normalized = value.map((item) => sanitizeTechnicalValue(item, '')).filter(Boolean).join(', ');
        if (normalized) rows.push([prefix, normalized]);
        return;
    }
    if (typeof value === 'object') {
        for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
            flattenNode(`${prefix} / ${humanizeDashboardLabel(key)}`, nestedValue, rows);
        }
        return;
    }
    rows.push([prefix, sanitizeTechnicalValue(value)]);
}

export function summarizeDashboardBlock(title: string, payload: DashboardBlockValue): Array<[string, string]> {
    const seriesRows: Array<[string, string]> = extractDashboardSeries(payload)
        .slice(-6)
        .map((point) => [`${title} - ${point.periodLabel}`, formatReportNumber(point.value)]);
    if (seriesRows.length > 0) {
        return seriesRows;
    }

    if (isSeriesBlock(payload)) {
        return payload.series.slice(-6).map((point) => [
            `${title} - ${point.period}`,
            point.value === null ? 'No disponible' : formatReportNumber(point.value)
        ]);
    }

    if (isFunnelBlock(payload)) {
        return [
            [`${title} - Creados`, formatReportNumber(payload.created)],
            [`${title} - Enviados`, formatReportNumber(payload.submitted)],
            [`${title} - Procesados`, formatReportNumber(payload.processed)],
            [`${title} - Conversión`, formatReportPercent(payload.conversion_created_to_processed)]
        ];
    }

    const rows: Array<[string, string]> = [];
    const adoption = payload.adoption_history;
    flattenNode(`${title} / Volumen y crecimiento`, adoption.volume_and_growth, rows);
    flattenNode(`${title} / Crecimiento de usuarios`, adoption.user_growth, rows);
    flattenNode(`${title} / Conversión`, adoption.conversion, rows);
    flattenNode(`${title} / Capacidad operativa`, adoption.operational_capacity, rows);
    return rows.slice(0, 18);
}
