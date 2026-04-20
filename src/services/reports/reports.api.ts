import { apiPost } from '../api/httpClient';
import { normalizeOperationalReportJob } from './reports.mappers';
import type {
    CreateOperationalReportJobRequest,
    OperationalReportJob,
    OperationalReportType
} from './reports.types';

const requestOptions = {
    auth: true,
    credentials: 'include' as const
};

const DEFAULT_MONTHS = 12;

function normalizeMonths(months: number | undefined) {
    if (!Number.isFinite(months)) return DEFAULT_MONTHS;
    const parsed = Math.trunc(months as number);
    if (parsed < 1) return 1;
    if (parsed > 120) return 120;
    return parsed;
}

export async function createOperationalReportJob(
    reportType: OperationalReportType,
    months: number | undefined
): Promise<OperationalReportJob> {
    const normalizedMonths = normalizeMonths(months);
    const body: CreateOperationalReportJobRequest = {
        report_type: reportType,
        months: normalizedMonths
    };

    const payload = await apiPost<unknown, CreateOperationalReportJobRequest>(
        '/api/v2/reports/jobs',
        body,
        requestOptions
    );

    return normalizeOperationalReportJob(payload, {
        reportType,
        months: normalizedMonths
    });
}
