export type DashboardEndpointFamily = 'series' | 'funnel' | 'adoption_history';

export type DashboardBlockKey =
    | 'adoptionHistory'
    | 'apiHealth'
    | 'dataQuality'
    | 'drift'
    | 'equity'
    | 'executiveSummary'
    | 'funnel'
    | 'humanReview'
    | 'modelMonitoring'
    | 'productivity'
    | 'questionnaireQuality'
    | 'questionnaireVolume'
    | 'retention'
    | 'userGrowth';

export type DashboardLoadStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export interface DashboardApiErrorShape {
    msg?: string;
    error?: string;
    details?: unknown;
    errors?: unknown;
}

export interface DashboardBlockError {
    status: number | null;
    message: string;
    code: string | null;
    details: unknown;
    errors: unknown;
}

export interface DashboardSeriesPoint {
    period: string;
    value: number | null;
    raw_value: string | number | boolean | null;
}

export interface DashboardSeriesResponse {
    series: DashboardSeriesPoint[];
}

export interface DashboardFunnelResponse {
    created: number | null;
    submitted: number | null;
    processed: number | null;
    conversion_created_to_processed: number | null;
}

export type DashboardMetricNode =
    | string
    | number
    | boolean
    | null
    | DashboardMetricNode[]
    | { [key: string]: DashboardMetricNode };

export interface DashboardAdoptionHistoryNode {
    volume_and_growth: DashboardMetricNode;
    user_growth: DashboardMetricNode;
    conversion: DashboardMetricNode;
    operational_capacity: DashboardMetricNode;
}

export interface DashboardAdoptionHistoryResponse {
    adoption_history: DashboardAdoptionHistoryNode;
}

export interface DashboardBlockState<TData> {
    status: DashboardLoadStatus;
    data: TData | null;
    error: DashboardBlockError | null;
}

export interface DashboardBlocksState {
    executiveSummary: DashboardBlockState<DashboardAdoptionHistoryResponse>;
    adoptionHistory: DashboardBlockState<DashboardAdoptionHistoryResponse>;
    funnel: DashboardBlockState<DashboardFunnelResponse>;
    productivity: DashboardBlockState<DashboardFunnelResponse>;
    humanReview: DashboardBlockState<DashboardFunnelResponse>;
    userGrowth: DashboardBlockState<DashboardSeriesResponse>;
    questionnaireVolume: DashboardBlockState<DashboardSeriesResponse>;
    questionnaireQuality: DashboardBlockState<DashboardSeriesResponse>;
    apiHealth: DashboardBlockState<DashboardSeriesResponse>;
    dataQuality: DashboardBlockState<DashboardSeriesResponse>;
    drift: DashboardBlockState<DashboardAdoptionHistoryResponse>;
    equity: DashboardBlockState<DashboardAdoptionHistoryResponse>;
    modelMonitoring: DashboardBlockState<DashboardAdoptionHistoryResponse>;
    retention: DashboardBlockState<DashboardAdoptionHistoryResponse>;
}

export interface DashboardRequestParams {
    months?: number;
}

export interface DashboardBlockConfig<
    TKey extends DashboardBlockKey = DashboardBlockKey,
    TData = unknown
> {
    key: TKey;
    title: string;
    family: DashboardEndpointFamily;
    endpoint: string;
    load: (months: number) => Promise<TData>;
}
