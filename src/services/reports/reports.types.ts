export const OPERATIONAL_REPORT_TYPES = [
    'executive_monthly',
    'adoption_history',
    'model_monitoring',
    'operational_productivity',
    'security_compliance',
    'traceability_audit'
] as const;

export type OperationalReportType = (typeof OPERATIONAL_REPORT_TYPES)[number];

export interface CreateOperationalReportJobRequest {
    report_type: OperationalReportType;
    months?: number;
}

export type OperationalReportScalar = string | number | boolean | null;

export type OperationalReportMetricNode =
    | OperationalReportScalar
    | OperationalReportMetricNode[]
    | { [key: string]: OperationalReportMetricNode };

export interface OperationalReportSeriesPoint {
    period: string;
    value: number | null;
    raw_value: OperationalReportScalar;
}

export interface OperationalReportConversionSummary {
    created: number | null;
    submitted: number | null;
    processed: number | null;
    conversion_created_to_processed: number | null;
}

export interface OperationalReportCapacitySummary {
    processed_sessions: number | null;
    registered_users: number | null;
    processed_per_user: number | null;
}

export interface OperationalReportAdoptionHistory {
    volume_and_growth: OperationalReportMetricNode;
    user_growth: OperationalReportMetricNode;
    conversion: OperationalReportMetricNode;
    operational_capacity: OperationalReportMetricNode;
    volume_and_growth_series: OperationalReportSeriesPoint[];
    user_growth_series: OperationalReportSeriesPoint[];
    conversion_summary: OperationalReportConversionSummary;
    operational_capacity_summary: OperationalReportCapacitySummary;
}

export interface OperationalReportDataset {
    adoption_history: OperationalReportAdoptionHistory | null;
}

export interface OperationalReportJob {
    report_job_id: string;
    report_type: OperationalReportType;
    report_type_label: string;
    months: number;
    generated_at: string;
    file_path: string | null;
    dataset: OperationalReportDataset;
}

export interface ReportsApiErrorShape {
    msg?: string;
    error?: string;
    details?: unknown;
    errors?: unknown;
}

export interface ReportsApiError {
    status: number | null;
    message: string;
    code: string | null;
    details: unknown;
    errors: unknown;
}

export type OperationalReportGenerationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface OperationalReportGenerationState {
    status: OperationalReportGenerationStatus;
    data: OperationalReportJob | null;
    error: ReportsApiError | null;
}

export type OperationalReportGenerationMap = Record<OperationalReportType, OperationalReportGenerationState>;

export const OPERATIONAL_REPORT_TYPE_LABELS: Record<OperationalReportType, string> = {
    executive_monthly: 'Resumen ejecutivo mensual',
    adoption_history: 'Historico de adopcion',
    model_monitoring: 'Monitoreo del modelo',
    operational_productivity: 'Productividad operativa',
    security_compliance: 'Seguridad y cumplimiento',
    traceability_audit: 'Auditoria de trazabilidad'
};

export function getOperationalReportTypeLabel(reportType: OperationalReportType) {
    return OPERATIONAL_REPORT_TYPE_LABELS[reportType];
}
