import { ApiError } from '../api/httpClient';
import type {
    OperationalReportCapacitySummary,
    OperationalReportConversionSummary,
    OperationalReportDatasetSection,
    OperationalReportGenerationState,
    OperationalReportJob,
    OperationalReportMetricNode,
    OperationalReportSeriesPoint,
    OperationalReportType,
    ReportsApiError,
    ReportsApiErrorShape
} from './reports.types';
import {
    OPERATIONAL_REPORT_TYPES,
    getOperationalReportSectionLabel,
    getOperationalReportTypeLabel
} from './reports.types';

const DEFAULT_MONTHS = 12;
const MIN_MONTHS = 1;
const MAX_MONTHS = 120;

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function asArray(value: unknown) {
    return Array.isArray(value) ? value : [];
}

function toNumberOrNull(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function toScalar(value: unknown): string | number | boolean | null {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    return null;
}

function sanitizeNode(value: unknown, depth = 0): OperationalReportMetricNode {
    if (depth >= 6 || value === undefined || value === null) return null;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeNode(item, depth + 1));
    }
    if (typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return Object.entries(record).reduce<Record<string, OperationalReportMetricNode>>((acc, [key, item]) => {
            acc[key] = sanitizeNode(item, depth + 1);
            return acc;
        }, {});
    }
    return null;
}

function parseSeries(node: unknown): OperationalReportSeriesPoint[] {
    const record = asRecord(node);
    const seriesSource = record?.series;
    return asArray(seriesSource)
        .map((row, index) => {
            const item = asRecord(row);
            if (!item) return null;
            const periodRaw = item.period;
            const period =
                typeof periodRaw === 'string' && periodRaw.trim().length > 0
                    ? periodRaw.trim()
                    : `Periodo ${index + 1}`;
            return {
                period,
                value: toNumberOrNull(item.value),
                raw_value: toScalar(item.value)
            } as OperationalReportSeriesPoint;
        })
        .filter((item): item is OperationalReportSeriesPoint => Boolean(item));
}

function parseConversionSummary(node: unknown): OperationalReportConversionSummary {
    const record = asRecord(node);
    return {
        created: toNumberOrNull(record?.created),
        submitted: toNumberOrNull(record?.submitted),
        processed: toNumberOrNull(record?.processed),
        conversion_created_to_processed: toNumberOrNull(record?.conversion_created_to_processed)
    };
}

function parseOperationalCapacitySummary(node: unknown): OperationalReportCapacitySummary {
    const record = asRecord(node);
    return {
        processed_sessions: toNumberOrNull(record?.processed_sessions),
        registered_users: toNumberOrNull(record?.registered_users),
        processed_per_user: toNumberOrNull(record?.processed_per_user)
    };
}

function hasAnyNumber(values: Array<number | null>) {
    return values.some((value) => typeof value === 'number' && Number.isFinite(value));
}

function detectSectionKind(
    key: string,
    node: unknown,
    series: OperationalReportSeriesPoint[],
    conversionSummary: OperationalReportConversionSummary | null
): OperationalReportDatasetSection['kind'] {
    if (key === 'adoption_history') return 'adoption_history';
    if (series.length > 0) return 'series';
    if (
        conversionSummary &&
        hasAnyNumber([
            conversionSummary.created,
            conversionSummary.submitted,
            conversionSummary.processed,
            conversionSummary.conversion_created_to_processed
        ])
    ) {
        return 'funnel';
    }
    if (node === null || typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
        return 'scalar';
    }
    if (Array.isArray(node)) return 'list';
    return 'structured';
}

function buildDatasetSections(dataset: Record<string, unknown>) {
    const sections: OperationalReportDatasetSection[] = [];

    Object.entries(dataset).forEach(([key, value]) => {
        const sanitizedNode = sanitizeNode(value);
        const series = parseSeries(value);
        const conversionSummary = parseConversionSummary(value);
        const capacitySummary = parseOperationalCapacitySummary(value);
        const hasConversionSummary = hasAnyNumber([
            conversionSummary.created,
            conversionSummary.submitted,
            conversionSummary.processed,
            conversionSummary.conversion_created_to_processed
        ]);
        const hasCapacitySummary = hasAnyNumber([
            capacitySummary.processed_sessions,
            capacitySummary.registered_users,
            capacitySummary.processed_per_user
        ]);

        sections.push({
            key,
            label: getOperationalReportSectionLabel(key),
            kind: detectSectionKind(key, value, series, hasConversionSummary ? conversionSummary : null),
            node: sanitizedNode,
            series,
            conversion_summary: hasConversionSummary ? conversionSummary : null,
            operational_capacity_summary: hasCapacitySummary ? capacitySummary : null
        });
    });

    return sections;
}

function normalizeReportType(value: unknown, fallback: OperationalReportType): OperationalReportType {
    if (typeof value !== 'string') return fallback;
    return OPERATIONAL_REPORT_TYPES.includes(value as OperationalReportType)
        ? (value as OperationalReportType)
        : fallback;
}

function normalizeMonths(months: number | undefined) {
    if (!Number.isFinite(months)) return DEFAULT_MONTHS;
    const parsed = Math.trunc(months as number);
    if (parsed < MIN_MONTHS) return MIN_MONTHS;
    if (parsed > MAX_MONTHS) return MAX_MONTHS;
    return parsed;
}

function normalizeReportJobId(value: unknown) {
    if (typeof value !== 'string') return '';
    return value.trim();
}

function normalizeFilePath(value: unknown) {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
}

export function normalizeOperationalReportJob(
    payload: unknown,
    context: { reportType: OperationalReportType; months?: number }
): OperationalReportJob {
    const root = asRecord(payload);
    const dataset = asRecord(root?.dataset);
    const datasetSections = dataset ? buildDatasetSections(dataset) : [];
    const adoptionHistory = asRecord(dataset?.adoption_history);

    const reportType = normalizeReportType(root?.report_type, context.reportType);
    const months = normalizeMonths(context.months);

    return {
        report_job_id: normalizeReportJobId(root?.report_job_id),
        report_type: reportType,
        report_type_label: getOperationalReportTypeLabel(reportType),
        months,
        generated_at: new Date().toISOString(),
        file_path: normalizeFilePath(root?.file_path),
        dataset: {
            adoption_history: adoptionHistory
                ? {
                      volume_and_growth: sanitizeNode(adoptionHistory.volume_and_growth),
                      user_growth: sanitizeNode(adoptionHistory.user_growth),
                      conversion: sanitizeNode(adoptionHistory.conversion),
                      operational_capacity: sanitizeNode(adoptionHistory.operational_capacity),
                      volume_and_growth_series: parseSeries(adoptionHistory.volume_and_growth),
                      user_growth_series: parseSeries(adoptionHistory.user_growth),
                      conversion_summary: parseConversionSummary(adoptionHistory.conversion),
                      operational_capacity_summary: parseOperationalCapacitySummary(adoptionHistory.operational_capacity)
                  }
                : null,
            sections: datasetSections
        }
    };
}

function resolveErrorMessage(status: number | null, payload: ReportsApiErrorShape | null) {
    if (typeof payload?.msg === 'string' && payload.msg.trim().length > 0) {
        return payload.msg.trim();
    }

    if (status === 400) return 'Solicitud invalida al generar el reporte.';
    if (status === 401) return 'Sesion expirada o autenticacion invalida.';
    if (status === 403) return 'No tienes permisos para generar este reporte.';
    if (status === 404) return 'El tipo de reporte no esta disponible en este entorno.';
    if (status === 429) return 'Demasiadas solicitudes. Intenta nuevamente en unos segundos.';
    if (status !== null && status >= 500) return 'Error interno al generar el reporte.';
    return 'No fue posible generar el reporte.';
}

export function normalizeOperationalReportError(error: unknown): ReportsApiError {
    if (error instanceof ApiError) {
        const payload = asRecord(error.payload) as ReportsApiErrorShape | null;
        return {
            status: error.status,
            message: resolveErrorMessage(error.status, payload),
            code: typeof payload?.error === 'string' ? payload.error : null,
            details: payload?.details ?? null,
            errors: payload?.errors ?? null
        };
    }

    if (error instanceof Error) {
        return {
            status: null,
            message: error.message || 'No fue posible generar el reporte.',
            code: null,
            details: null,
            errors: null
        };
    }

    return {
        status: null,
        message: 'No fue posible generar el reporte.',
        code: null,
        details: null,
        errors: null
    };
}

export function createInitialReportGenerationState(): OperationalReportGenerationState {
    return {
        status: 'idle',
        data: null,
        error: null
    };
}
