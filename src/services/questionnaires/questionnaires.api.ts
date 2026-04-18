import { apiDelete, apiGet, apiGetBlob, apiPatch, apiPost } from '../api/httpClient';
import type {
    ActiveQuestionnairesV2Response,
    AddQuestionnaireTagPayload,
    CreateQuestionnaireSessionV2Payload,
    DownloadPdfResult,
    PatchSessionAnswersV2Payload,
    QuestionnaireHistoryListV2Response,
    QuestionnaireSessionPageV2Response,
    QuestionnaireSessionV2DTO,
    QuestionnaireV2Mode,
    QuestionnaireV2Role,
    ShareQuestionnairePayload,
    SubmitSessionV2Payload
} from './questionnaires.types';

const requestOptions = {
    auth: true,
    credentials: 'include' as const
};

const defaultPageSize = 20;

interface QueryParams {
    [key: string]: string | number | boolean | undefined | null;
}

function buildSearch(params: QueryParams) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        search.set(key, String(value));
    });
    return search.toString();
}

function normalizePagination(payload: unknown, fallbackPage = 1, fallbackPageSize = defaultPageSize) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return {
            page: fallbackPage,
            page_size: fallbackPageSize,
            total: 0,
            pages: 1
        };
    }

    const record = payload as Record<string, unknown>;
    const page = Number(record.page);
    const pageSize = Number(record.page_size);
    const total = Number(record.total);
    const pages = Number(record.pages);

    return {
        page: Number.isFinite(page) && page > 0 ? page : fallbackPage,
        page_size: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : fallbackPageSize,
        total: Number.isFinite(total) && total >= 0 ? total : 0,
        pages: Number.isFinite(pages) && pages > 0 ? pages : 1
    };
}

function asArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeActiveQuestionnairesResponse(payload: unknown): ActiveQuestionnairesV2Response {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return {
            items: [],
            pagination: normalizePagination(null)
        };
    }

    const record = payload as Record<string, unknown>;
    const directItems = asArray<Record<string, unknown>>(record.items);
    const fallbackTemplate = record.questionnaire_template;

    const items = directItems.length > 0
        ? directItems
        : fallbackTemplate && typeof fallbackTemplate === 'object' && !Array.isArray(fallbackTemplate)
            ? [fallbackTemplate as Record<string, unknown>]
            : [];

    return {
        items: items as ActiveQuestionnairesV2Response['items'],
        pagination: normalizePagination(record.pagination, 1, defaultPageSize)
    };
}

function normalizeSessionPageResponse(payload: unknown, page: number, pageSize: number): QuestionnaireSessionPageV2Response {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return {
            items: [],
            pagination: normalizePagination(null, page, pageSize)
        };
    }

    const record = payload as Record<string, unknown>;
    const items = asArray<Record<string, unknown>>(record.items);
    const fallbackQuestions = asArray<Record<string, unknown>>(record.questions);

    return {
        items: (items.length > 0 ? items : fallbackQuestions) as QuestionnaireSessionPageV2Response['items'],
        pagination: normalizePagination(record.pagination, page, pageSize)
    };
}

function normalizeHistoryResponse(payload: unknown, page: number, pageSize: number): QuestionnaireHistoryListV2Response {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return {
            items: [],
            pagination: normalizePagination(null, page, pageSize)
        };
    }

    const record = payload as Record<string, unknown>;
    return {
        items: asArray(record.items) as QuestionnaireHistoryListV2Response['items'],
        pagination: normalizePagination(record.pagination, page, pageSize)
    };
}

export function getActiveQuestionnairesV2(params: {
    mode: QuestionnaireV2Mode;
    role: QuestionnaireV2Role;
    include_full?: boolean;
    page?: number;
    page_size?: number;
}) {
    const query = buildSearch({
        mode: params.mode,
        role: params.role,
        include_full: params.include_full,
        page: params.page,
        page_size: params.page_size
    });
    return apiGet<unknown>(`/api/v2/questionnaires/active?${query}`, requestOptions).then(
        normalizeActiveQuestionnairesResponse
    );
}

export function createQuestionnaireSessionV2(payload: CreateQuestionnaireSessionV2Payload) {
    return apiPost<QuestionnaireSessionV2DTO, CreateQuestionnaireSessionV2Payload>(
        '/api/v2/questionnaires/sessions',
        payload,
        requestOptions
    );
}

export function getQuestionnaireSessionV2(sessionId: string) {
    return apiGet<QuestionnaireSessionV2DTO>(`/api/v2/questionnaires/sessions/${sessionId}`, requestOptions);
}

export function getQuestionnaireSessionPageV2(sessionId: string, params?: { page?: number; page_size?: number }) {
    const page = params?.page ?? 1;
    const pageSize = params?.page_size ?? 200;
    const query = buildSearch({
        page,
        page_size: pageSize
    });
    return apiGet<unknown>(`/api/v2/questionnaires/sessions/${sessionId}/page?${query}`, requestOptions).then(
        (payload) => normalizeSessionPageResponse(payload, page, pageSize)
    );
}

export function patchQuestionnaireSessionAnswersV2(sessionId: string, payload: PatchSessionAnswersV2Payload) {
    return apiPatch<unknown, PatchSessionAnswersV2Payload>(
        `/api/v2/questionnaires/sessions/${sessionId}/answers`,
        payload,
        requestOptions
    );
}

export function submitQuestionnaireSessionV2(sessionId: string, payload?: SubmitSessionV2Payload) {
    return apiPost<unknown, SubmitSessionV2Payload>(
        `/api/v2/questionnaires/sessions/${sessionId}/submit`,
        payload ?? { force_reprocess: false },
        requestOptions
    );
}

export function getQuestionnaireHistoryV2(params?: {
    status?: 'draft' | 'submitted' | 'processed';
    page?: number;
    page_size?: number;
}) {
    const page = params?.page ?? 1;
    const pageSize = params?.page_size ?? defaultPageSize;
    const query = buildSearch({
        status: params?.status,
        page,
        page_size: pageSize
    });
    return apiGet<unknown>(`/api/v2/questionnaires/history?${query}`, requestOptions).then(
        (payload) => normalizeHistoryResponse(payload, page, pageSize)
    );
}

export function getQuestionnaireHistoryDetailV2(sessionId: string) {
    return apiGet<unknown>(`/api/v2/questionnaires/history/${sessionId}`, requestOptions);
}

export function getQuestionnaireHistoryResultsV2(sessionId: string) {
    return apiGet<unknown>(`/api/v2/questionnaires/history/${sessionId}/results`, requestOptions);
}

export function addQuestionnaireHistoryTagV2(sessionId: string, payload: AddQuestionnaireTagPayload) {
    return apiPost<unknown, AddQuestionnaireTagPayload>(
        `/api/v2/questionnaires/history/${sessionId}/tags`,
        payload,
        requestOptions
    );
}

export function deleteQuestionnaireHistoryTagV2(sessionId: string, tagId: string) {
    return apiDelete<unknown>(
        `/api/v2/questionnaires/history/${sessionId}/tags/${tagId}`,
        requestOptions
    );
}

export function shareQuestionnaireHistoryV2(sessionId: string, payload?: ShareQuestionnairePayload) {
    return apiPost<unknown, ShareQuestionnairePayload>(
        `/api/v2/questionnaires/history/${sessionId}/share`,
        payload ?? {},
        requestOptions
    );
}

export function generateQuestionnaireHistoryPdfV2(sessionId: string) {
    return apiPost<unknown, Record<string, never>>(
        `/api/v2/questionnaires/history/${sessionId}/pdf/generate`,
        {},
        requestOptions
    );
}

export function getQuestionnaireHistoryPdfV2(sessionId: string) {
    return apiGet<unknown>(`/api/v2/questionnaires/history/${sessionId}/pdf`, requestOptions);
}

export async function downloadQuestionnaireHistoryPdfV2(sessionId: string): Promise<DownloadPdfResult> {
    const blob = await apiGetBlob(
        `/api/v2/questionnaires/history/${sessionId}/pdf/download`,
        requestOptions
    );
    return {
        blob,
        filename: `cuestionario-${sessionId}.pdf`
    };
}

export function getSharedQuestionnaireV2(questionnaireId: string, shareCode: string) {
    return apiGet<unknown>(`/api/v2/questionnaires/shared/${questionnaireId}/${shareCode}`);
}
