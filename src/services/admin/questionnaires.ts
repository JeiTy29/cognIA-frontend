import { apiGet, apiPost } from '../api/httpClient';

const requestOptions = {
    auth: true,
    credentials: 'include' as const
};

export interface AdminQuestionnaireItem {
    id: string;
    name: string;
    version: string;
    description: string | null;
    is_active: boolean;
    is_archived: boolean;
    created_at: string | null;
    updated_at: string | null;
}

export interface AdminQuestionnairesResponse {
    items: AdminQuestionnaireItem[];
    pagination: {
        page: number;
        page_size: number;
        total: number;
        pages: number;
    };
}

export interface ListAdminQuestionnairesParams {
    page: number;
    page_size: number;
    name?: string;
    version?: string;
    is_active?: boolean;
    is_archived?: boolean;
    sort?: string;
    order?: 'asc' | 'desc';
}

export interface CloneQuestionnairePayload {
    version: string;
    name?: string;
    description?: string;
}

export interface CreateQuestionnaireTemplatePayload {
    name: string;
    version: string;
    description?: string;
}

export interface CreateQuestionnaireTemplateResponse {
    template_id?: string;
    id?: string;
    name?: string;
    version?: string;
    description?: string | null;
    [key: string]: unknown;
}

export interface QuestionnaireQuestionOptionPayload {
    label: string;
    value: string | number | boolean;
}

export interface CreateQuestionnaireQuestionPayload {
    code: string;
    text: string;
    response_type: string;
    position: number;
    response_min?: number;
    response_max?: number;
    response_options?: QuestionnaireQuestionOptionPayload[];
}

export interface CreateQuestionnaireQuestionResponse {
    id?: string;
    question_id?: string;
    code?: string;
    text?: string;
    response_type?: string;
    position?: number;
    response_min?: number | null;
    response_max?: number | null;
    response_options?: QuestionnaireQuestionOptionPayload[] | null;
    [key: string]: unknown;
}

export interface PublishQuestionnaireResponse {
    msg: string;
    template_id: string;
}

export interface ArchiveQuestionnaireResponse {
    msg: string;
    template_id: string;
}

export interface CloneQuestionnaireResponse {
    template_id: string;
    name: string;
    version: string;
    question_count: number;
}

function appendBooleanParam(search: URLSearchParams, key: string, value: boolean | undefined) {
    if (typeof value === 'boolean') {
        search.set(key, String(value));
    }
}

function appendStringParam(search: URLSearchParams, key: string, value: string | undefined) {
    if (value && value.trim().length > 0) {
        search.set(key, value.trim());
    }
}

export function getAdminQuestionnaires(params: ListAdminQuestionnairesParams) {
    const search = new URLSearchParams({
        page: String(params.page),
        page_size: String(params.page_size)
    });

    appendStringParam(search, 'name', params.name);
    appendStringParam(search, 'version', params.version);
    appendBooleanParam(search, 'is_active', params.is_active);
    appendBooleanParam(search, 'is_archived', params.is_archived);
    appendStringParam(search, 'sort', params.sort);
    appendStringParam(search, 'order', params.order);

    return apiGet<AdminQuestionnairesResponse>(
        `/api/admin/questionnaires?${search.toString()}`,
        requestOptions
    );
}

export function publishQuestionnaire(templateId: string) {
    return apiPost<PublishQuestionnaireResponse, Record<string, never>>(
        `/api/admin/questionnaires/${templateId}/publish`,
        {},
        requestOptions
    );
}

export function archiveQuestionnaire(templateId: string) {
    return apiPost<ArchiveQuestionnaireResponse, Record<string, never>>(
        `/api/admin/questionnaires/${templateId}/archive`,
        {},
        requestOptions
    );
}

export function cloneQuestionnaire(templateId: string, payload: CloneQuestionnairePayload) {
    return apiPost<CloneQuestionnaireResponse, CloneQuestionnairePayload>(
        `/api/admin/questionnaires/${templateId}/clone`,
        payload,
        requestOptions
    );
}

export function createQuestionnaireTemplate(payload: CreateQuestionnaireTemplatePayload) {
    return apiPost<CreateQuestionnaireTemplateResponse, CreateQuestionnaireTemplatePayload>(
        '/api/v1/questionnaires',
        payload,
        requestOptions
    );
}

export function createQuestionnaireQuestion(templateId: string, payload: CreateQuestionnaireQuestionPayload) {
    return apiPost<CreateQuestionnaireQuestionResponse, CreateQuestionnaireQuestionPayload>(
        `/api/v1/questionnaires/${templateId}/questions`,
        payload,
        requestOptions
    );
}
