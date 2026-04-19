import { apiGet } from '../api/httpClient';
import {
    normalizeAdoptionHistoryResponse,
    normalizeFunnelResponse,
    normalizeSeriesResponse
} from './dashboard.mappers';
import type {
    DashboardAdoptionHistoryResponse,
    DashboardFunnelResponse,
    DashboardSeriesResponse
} from './dashboard.types';

const requestOptions = {
    auth: true,
    credentials: 'include' as const
};

const DEFAULT_MONTHS = 12;

function normalizeMonths(months: number | undefined) {
    if (!Number.isFinite(months)) return DEFAULT_MONTHS;
    const value = Math.trunc(months as number);
    if (value < 1) return 1;
    if (value > 120) return 120;
    return value;
}

function buildPath(path: string, months: number | undefined) {
    const value = normalizeMonths(months);
    return `${path}?months=${value}`;
}

async function getDashboardSeriesBlock(path: string, months?: number): Promise<DashboardSeriesResponse> {
    const payload = await apiGet<unknown>(buildPath(path, months), requestOptions);
    return normalizeSeriesResponse(payload);
}

async function getDashboardFunnelBlock(path: string, months?: number): Promise<DashboardFunnelResponse> {
    const payload = await apiGet<unknown>(buildPath(path, months), requestOptions);
    return normalizeFunnelResponse(payload);
}

async function getDashboardAdoptionHistoryBlockRequest(path: string, months?: number): Promise<DashboardAdoptionHistoryResponse> {
    const payload = await apiGet<unknown>(buildPath(path, months), requestOptions);
    return normalizeAdoptionHistoryResponse(payload);
}

export function getDashboardAdoptionHistoryBlock(months?: number) {
    return getDashboardAdoptionHistoryBlockRequest('/api/v2/dashboard/adoption-history', months);
}

export function getDashboardApiHealth(months?: number) {
    return getDashboardSeriesBlock('/api/v2/dashboard/api-health', months);
}

export function getDashboardDataQuality(months?: number) {
    return getDashboardSeriesBlock('/api/v2/dashboard/data-quality', months);
}

export function getDashboardDrift(months?: number) {
    return getDashboardAdoptionHistoryBlockRequest('/api/v2/dashboard/drift', months);
}

export function getDashboardEquity(months?: number) {
    return getDashboardAdoptionHistoryBlockRequest('/api/v2/dashboard/equity', months);
}

export function getDashboardExecutiveSummary(months?: number) {
    return getDashboardAdoptionHistoryBlockRequest('/api/v2/dashboard/executive-summary', months);
}

export function getDashboardFunnel(months?: number) {
    return getDashboardFunnelBlock('/api/v2/dashboard/funnel', months);
}

export function getDashboardHumanReview(months?: number) {
    return getDashboardFunnelBlock('/api/v2/dashboard/human-review', months);
}

export function getDashboardModelMonitoring(months?: number) {
    return getDashboardAdoptionHistoryBlockRequest('/api/v2/dashboard/model-monitoring', months);
}

export function getDashboardProductivity(months?: number) {
    return getDashboardFunnelBlock('/api/v2/dashboard/productivity', months);
}

export function getDashboardQuestionnaireQuality(months?: number) {
    return getDashboardSeriesBlock('/api/v2/dashboard/questionnaire-quality', months);
}

export function getDashboardQuestionnaireVolume(months?: number) {
    return getDashboardSeriesBlock('/api/v2/dashboard/questionnaire-volume', months);
}

export function getDashboardRetention(months?: number) {
    return getDashboardAdoptionHistoryBlockRequest('/api/v2/dashboard/retention', months);
}

export function getDashboardUserGrowth(months?: number) {
    return getDashboardSeriesBlock('/api/v2/dashboard/user-growth', months);
}
