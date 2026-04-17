import { apiGet, apiPatch, apiPost, apiPostFormData } from '../api/httpClient';
import type {
    CreateProblemReportPayload,
    CreateProblemReportResponse,
    ProblemReportDetailResponse,
    ProblemReportListResponse,
    UpdateProblemReportPayload,
    UpdateProblemReportResponse
} from './problemReports.types';

const requestOptions = {
    auth: true,
    credentials: 'include' as const
};

export interface ProblemReportListParams {
    page: number;
    page_size: number;
    status?: string;
    issue_type?: string;
    reporter_role?: string;
    q?: string;
    from_date?: string;
    to_date?: string;
    sort?: string;
    order?: 'asc' | 'desc';
}

function appendStringParam(search: URLSearchParams, key: string, value: string | undefined) {
    if (value && value.trim().length > 0) {
        search.set(key, value.trim());
    }
}

function buildListSearch(params: ProblemReportListParams) {
    const search = new URLSearchParams({
        page: String(params.page),
        page_size: String(params.page_size)
    });

    appendStringParam(search, 'status', params.status);
    appendStringParam(search, 'issue_type', params.issue_type);
    appendStringParam(search, 'reporter_role', params.reporter_role);
    appendStringParam(search, 'q', params.q);
    appendStringParam(search, 'from_date', params.from_date);
    appendStringParam(search, 'to_date', params.to_date);
    appendStringParam(search, 'sort', params.sort);
    appendStringParam(search, 'order', params.order);

    return search;
}

function buildCreateJsonPayload(payload: CreateProblemReportPayload) {
    return {
        issue_type: payload.issue_type,
        description: payload.description,
        ...(payload.source_module ? { source_module: payload.source_module } : {}),
        ...(payload.source_path ? { source_path: payload.source_path } : {}),
        ...(payload.related_questionnaire_session_id
            ? { related_questionnaire_session_id: payload.related_questionnaire_session_id }
            : {}),
        ...(payload.related_questionnaire_history_id
            ? { related_questionnaire_history_id: payload.related_questionnaire_history_id }
            : {}),
        ...(payload.metadata ? { metadata: payload.metadata } : {})
    };
}

function buildCreateFormData(payload: CreateProblemReportPayload) {
    const formData = new FormData();
    formData.append('issue_type', payload.issue_type);
    formData.append('description', payload.description);

    if (payload.source_module) {
        formData.append('source_module', payload.source_module);
    }
    if (payload.source_path) {
        formData.append('source_path', payload.source_path);
    }
    if (payload.related_questionnaire_session_id) {
        formData.append('related_questionnaire_session_id', payload.related_questionnaire_session_id);
    }
    if (payload.related_questionnaire_history_id) {
        formData.append('related_questionnaire_history_id', payload.related_questionnaire_history_id);
    }
    if (payload.metadata) {
        formData.append('metadata', JSON.stringify(payload.metadata));
    }
    if (payload.attachment) {
        formData.append('attachment', payload.attachment, payload.attachment.name);
    }

    return formData;
}

export function createProblemReport(payload: CreateProblemReportPayload) {
    if (payload.attachment) {
        return apiPostFormData<CreateProblemReportResponse>(
            '/api/problem-reports',
            buildCreateFormData(payload),
            requestOptions
        );
    }

    return apiPost<CreateProblemReportResponse, ReturnType<typeof buildCreateJsonPayload>>(
        '/api/problem-reports',
        buildCreateJsonPayload(payload),
        requestOptions
    );
}

export function getMyProblemReports(params: ProblemReportListParams) {
    const search = buildListSearch(params);
    return apiGet<ProblemReportListResponse>(
        `/api/problem-reports/mine?${search.toString()}`,
        requestOptions
    );
}

export function getAdminProblemReports(params: ProblemReportListParams) {
    const search = buildListSearch(params);
    return apiGet<ProblemReportListResponse>(
        `/api/admin/problem-reports?${search.toString()}`,
        requestOptions
    );
}

export function getAdminProblemReportById(reportId: string) {
    return apiGet<ProblemReportDetailResponse>(
        `/api/admin/problem-reports/${reportId}`,
        requestOptions
    );
}

export function updateAdminProblemReport(reportId: string, payload: UpdateProblemReportPayload) {
    return apiPatch<UpdateProblemReportResponse, UpdateProblemReportPayload>(
        `/api/admin/problem-reports/${reportId}`,
        payload,
        requestOptions
    );
}
