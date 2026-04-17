import { apiGet, apiPatch } from '../api/httpClient';

const requestOptions = {
    auth: true,
    credentials: 'include' as const
};

export const ADMIN_EVALUATION_STATUSES = ['draft', 'submitted', 'completed'] as const;

export type AdminEvaluationStatus = (typeof ADMIN_EVALUATION_STATUSES)[number];

export interface AdminEvaluationItem {
    id: string;
    status: string;
    age_at_evaluation: number | null;
    evaluation_date: string | null;
    subject_id: string | null;
    psychologist_id: string | null;
    created_at: string | null;
}

export interface AdminEvaluationsResponse {
    items: AdminEvaluationItem[];
    pagination: {
        page: number;
        page_size: number;
        total: number;
        pages: number;
    };
}

export interface ListAdminEvaluationsParams {
    page: number;
    page_size: number;
    status?: string;
    age_min?: number;
    age_max?: number;
    date_from?: string;
    date_to?: string;
    psychologist_id?: string;
    subject_id?: string;
    sort?: string;
    order?: 'asc' | 'desc';
}

export interface UpdateEvaluationStatusPayload {
    status: string;
}

export interface UpdateEvaluationStatusResponse {
    msg: string;
    evaluation_id: string;
    status: string;
}

function appendStringParam(search: URLSearchParams, key: string, value: string | undefined) {
    if (value && value.trim().length > 0) {
        search.set(key, value.trim());
    }
}

function appendNumberParam(search: URLSearchParams, key: string, value: number | undefined) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        search.set(key, String(value));
    }
}

export function getAdminEvaluations(params: ListAdminEvaluationsParams) {
    const search = new URLSearchParams({
        page: String(params.page),
        page_size: String(params.page_size)
    });

    appendStringParam(search, 'status', params.status);
    appendNumberParam(search, 'age_min', params.age_min);
    appendNumberParam(search, 'age_max', params.age_max);
    appendStringParam(search, 'date_from', params.date_from);
    appendStringParam(search, 'date_to', params.date_to);
    appendStringParam(search, 'psychologist_id', params.psychologist_id);
    appendStringParam(search, 'subject_id', params.subject_id);
    appendStringParam(search, 'sort', params.sort);
    appendStringParam(search, 'order', params.order);

    return apiGet<AdminEvaluationsResponse>(
        `/api/admin/evaluations?${search.toString()}`,
        requestOptions
    );
}

export function updateEvaluationStatus(evaluationId: string, payload: UpdateEvaluationStatusPayload) {
    return apiPatch<UpdateEvaluationStatusResponse, UpdateEvaluationStatusPayload>(
        `/api/admin/evaluations/${evaluationId}/status`,
        payload,
        requestOptions
    );
}
