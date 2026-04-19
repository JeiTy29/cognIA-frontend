import {
    apiDelete,
    apiGet,
    apiGetBlobWithMeta,
    apiPatch,
    apiPost,
    apiPostNoBody
} from '../api/httpClient';
import type {
    ActiveQuestionnairesV2Response,
    AddQuestionnaireTagPayload,
    CreateQuestionnaireSessionV2Payload,
    DownloadPdfResult,
    PatchSessionAnswersV2Payload,
    QuestionnaireHistoryDetailV2DTO,
    QuestionnaireHistoryListV2Response,
    QuestionnaireHistoryStatusFilter,
    QuestionnairePdfInfoV2DTO,
    QuestionnaireQuestionV2DTO,
    QuestionnaireSessionPageV2Response,
    QuestionnaireSessionV2DTO,
    QuestionnaireShareResponseDTO,
    QuestionnaireSharedDataV2DTO,
    QuestionnaireTagDTO,
    QuestionnaireTemplateV2DTO,
    QuestionnaireV2Mode,
    QuestionnaireV2Role,
    ShareQuestionnairePayload
} from './questionnaires.types';

const requestOptions = {
    auth: true,
    credentials: 'include' as const
};

const defaultPageSize = 20;
const sessionDefaultPageSize = 200;

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

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function asArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

function pickRecord(payload: unknown, keys: string[]) {
    const record = asRecord(payload);
    if (!record) return null;

    for (const key of keys) {
        const candidate = asRecord(record[key]);
        if (candidate) return candidate;
    }

    return record;
}

function normalizePagination(payload: unknown, fallbackPage = 1, fallbackPageSize = defaultPageSize) {
    const source = asRecord(payload);
    if (!source) {
        return {
            page: fallbackPage,
            page_size: fallbackPageSize,
            total: 0,
            pages: 1
        };
    }

    const page = Number(source.page);
    const pageSize = Number(source.page_size);
    const total = Number(source.total);
    const pages = Number(source.pages);

    return {
        page: Number.isFinite(page) && page > 0 ? page : fallbackPage,
        page_size: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : fallbackPageSize,
        total: Number.isFinite(total) && total >= 0 ? total : 0,
        pages: Number.isFinite(pages) && pages > 0 ? pages : 1
    };
}

function normalizeTemplate(value: unknown): QuestionnaireTemplateV2DTO | null {
    const record = asRecord(value);
    if (!record) return null;
    const id = typeof record.id === 'string' ? record.id : typeof record.template_id === 'string' ? record.template_id : null;
    if (!id) return null;
    return {
        ...record,
        id
    } as QuestionnaireTemplateV2DTO;
}

function normalizeQuestion(value: unknown): QuestionnaireQuestionV2DTO | null {
    const record = asRecord(value);
    if (!record) return null;
    const id = typeof record.id === 'string' ? record.id : null;
    const text = typeof record.text === 'string' ? record.text : null;
    if (!id || !text) return null;
    return {
        ...record,
        id,
        text,
        response_type: typeof record.response_type === 'string' ? record.response_type : 'text'
    } as QuestionnaireQuestionV2DTO;
}

function normalizeTag(value: unknown): QuestionnaireTagDTO | null {
    const record = asRecord(value);
    if (!record) return null;
    return {
        ...record,
        id:
            typeof record.id === 'string'
                ? record.id
                : typeof record.tag_id === 'string'
                    ? record.tag_id
                    : undefined
    };
}

function normalizeSession(payload: unknown): QuestionnaireSessionV2DTO {
    const record = pickRecord(payload, ['session', 'item', 'data', 'result']);
    if (!record) {
        return { id: '' };
    }

    const id =
        typeof record.id === 'string'
            ? record.id
            : typeof record.session_id === 'string'
                ? record.session_id
                : '';

    return {
        ...record,
        id
    } as QuestionnaireSessionV2DTO;
}

function normalizeActiveQuestionnairesResponse(payload: unknown): ActiveQuestionnairesV2Response {
    const root = pickRecord(payload, ['data', 'result', 'response']);
    if (!root) {
        return {
            items: [],
            pagination: normalizePagination(null)
        };
    }

    const directItems = asArray(root.items).map(normalizeTemplate).filter((item): item is QuestionnaireTemplateV2DTO => Boolean(item));
    const alternativeItems = asArray(root.questionnaires).map(normalizeTemplate).filter((item): item is QuestionnaireTemplateV2DTO => Boolean(item));
    const fallbackTemplate = normalizeTemplate(root.questionnaire_template);
    const items = directItems.length > 0
        ? directItems
        : alternativeItems.length > 0
            ? alternativeItems
            : fallbackTemplate
                ? [fallbackTemplate]
                : [];

    return {
        items,
        pagination: normalizePagination(root.pagination, 1, defaultPageSize)
    };
}

function normalizeSessionPageResponse(payload: unknown, page: number, pageSize: number): QuestionnaireSessionPageV2Response {
    const root = pickRecord(payload, ['page', 'data', 'result']);
    if (!root) {
        return {
            items: [],
            pagination: normalizePagination(null, page, pageSize)
        };
    }

    const directItems = asArray(root.items).map(normalizeQuestion).filter((item): item is QuestionnaireQuestionV2DTO => Boolean(item));
    const fallbackQuestions = asArray(root.questions).map(normalizeQuestion).filter((item): item is QuestionnaireQuestionV2DTO => Boolean(item));

    return {
        items: directItems.length > 0 ? directItems : fallbackQuestions,
        pagination: normalizePagination(root.pagination, page, pageSize)
    };
}

function normalizeHistoryResponse(payload: unknown, page: number, pageSize: number): QuestionnaireHistoryListV2Response {
    const root = pickRecord(payload, ['data', 'result']);
    if (!root) {
        return {
            items: [],
            pagination: normalizePagination(null, page, pageSize)
        };
    }

    const items = asArray(root.items) as QuestionnaireHistoryListV2Response['items'];
    return {
        items,
        pagination: normalizePagination(root.pagination, page, pageSize)
    };
}

function normalizeHistoryDetail(payload: unknown): QuestionnaireHistoryDetailV2DTO {
    const root = pickRecord(payload, ['history', 'item', 'session', 'data', 'result']);
    if (!root) {
        return { id: '' };
    }

    const tags = asArray(root.tags).map(normalizeTag).filter((item): item is QuestionnaireTagDTO => Boolean(item));
    return {
        ...root,
        id:
            typeof root.id === 'string'
                ? root.id
                : typeof root.session_id === 'string'
                    ? root.session_id
                    : '',
        tags
    } as QuestionnaireHistoryDetailV2DTO;
}

function normalizeResults(payload: unknown): Record<string, unknown> {
    const root = pickRecord(payload, ['results', 'result', 'data']);
    return root ?? {};
}

function normalizeShareResponse(payload: unknown): QuestionnaireShareResponseDTO {
    const root = pickRecord(payload, ['share', 'data', 'result']);
    if (!root) return {};
    return {
        ...root,
        questionnaire_id:
            typeof root.questionnaire_id === 'string'
                ? root.questionnaire_id
                : typeof root.questionnaireId === 'string'
                    ? root.questionnaireId
                    : undefined,
        share_code:
            typeof root.share_code === 'string'
                ? root.share_code
                : typeof root.shareCode === 'string'
                    ? root.shareCode
                    : undefined
    } as QuestionnaireShareResponseDTO;
}

function normalizePdfInfo(payload: unknown): QuestionnairePdfInfoV2DTO {
    const root = pickRecord(payload, ['pdf', 'data', 'result']);
    return (root ?? {}) as QuestionnairePdfInfoV2DTO;
}

function normalizeSharedQuestionnaire(payload: unknown): QuestionnaireSharedDataV2DTO {
    const root = pickRecord(payload, ['shared', 'questionnaire', 'data', 'result']);
    if (!root) return {};
    return {
        ...root,
        questionnaire_id:
            typeof root.questionnaire_id === 'string'
                ? root.questionnaire_id
                : typeof root.questionnaireId === 'string'
                    ? root.questionnaireId
                    : undefined,
        share_code:
            typeof root.share_code === 'string'
                ? root.share_code
                : typeof root.shareCode === 'string'
                    ? root.shareCode
                    : undefined,
        results:
            asRecord(root.results) ??
            asRecord(root.result) ??
            asRecord(root.summary) ??
            null
    } as QuestionnaireSharedDataV2DTO;
}

function extractFilenameFromHeaders(headers: Headers) {
    const disposition = headers.get('content-disposition') ?? '';
    if (!disposition) return null;

    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
        try {
            return decodeURIComponent(utf8Match[1]);
        } catch {
            return utf8Match[1];
        }
    }

    const basicMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
    return basicMatch?.[1] ?? null;
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

    const path = query.length > 0 ? `/api/v2/questionnaires/active?${query}` : '/api/v2/questionnaires/active';
    return apiGet<unknown>(path, requestOptions).then(normalizeActiveQuestionnairesResponse);
}

export function createQuestionnaireSessionV2(payload: CreateQuestionnaireSessionV2Payload) {
    return apiPost<unknown, CreateQuestionnaireSessionV2Payload>(
        '/api/v2/questionnaires/sessions',
        payload,
        requestOptions
    ).then(normalizeSession);
}

export function getQuestionnaireSessionV2(sessionId: string) {
    return apiGet<unknown>(`/api/v2/questionnaires/sessions/${sessionId}`, requestOptions).then(normalizeSession);
}

export function getQuestionnaireSessionPageV2(sessionId: string, params?: { page?: number; page_size?: number }) {
    const page = params?.page ?? 1;
    const pageSize = params?.page_size ?? sessionDefaultPageSize;
    const query = buildSearch({
        page,
        page_size: pageSize
    });
    const path = `/api/v2/questionnaires/sessions/${sessionId}/page?${query}`;
    return apiGet<unknown>(path, requestOptions).then((payload) => normalizeSessionPageResponse(payload, page, pageSize));
}

export function patchQuestionnaireSessionAnswersV2(sessionId: string, payload: PatchSessionAnswersV2Payload) {
    return apiPatch<unknown, PatchSessionAnswersV2Payload>(
        `/api/v2/questionnaires/sessions/${sessionId}/answers`,
        payload,
        requestOptions
    );
}

export function submitQuestionnaireSessionV2(sessionId: string) {
    return apiPostNoBody<Record<string, unknown>>(
        `/api/v2/questionnaires/sessions/${sessionId}/submit`,
        requestOptions
    );
}

export function getQuestionnaireHistoryV2(params?: {
    status?: QuestionnaireHistoryStatusFilter;
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
    return apiGet<unknown>(`/api/v2/questionnaires/history/${sessionId}`, requestOptions).then(normalizeHistoryDetail);
}

export function getQuestionnaireHistoryResultsV2(sessionId: string) {
    return apiGet<unknown>(`/api/v2/questionnaires/history/${sessionId}/results`, requestOptions).then(normalizeResults);
}

export function addQuestionnaireHistoryTagV2(sessionId: string, payload: AddQuestionnaireTagPayload) {
    return apiPost<Record<string, unknown>, AddQuestionnaireTagPayload>(
        `/api/v2/questionnaires/history/${sessionId}/tags`,
        payload,
        requestOptions
    );
}

export function deleteQuestionnaireHistoryTagV2(sessionId: string, tagId: string) {
    return apiDelete<Record<string, unknown>>(
        `/api/v2/questionnaires/history/${sessionId}/tags/${tagId}`,
        requestOptions
    );
}

export function shareQuestionnaireHistoryV2(sessionId: string, payload?: ShareQuestionnairePayload) {
    if (payload) {
        return apiPost<unknown, ShareQuestionnairePayload>(
            `/api/v2/questionnaires/history/${sessionId}/share`,
            payload,
            requestOptions
        ).then(normalizeShareResponse);
    }

    return apiPostNoBody<unknown>(
        `/api/v2/questionnaires/history/${sessionId}/share`,
        requestOptions
    ).then(normalizeShareResponse);
}

export function generateQuestionnaireHistoryPdfV2(sessionId: string) {
    return apiPostNoBody<Record<string, unknown>>(
        `/api/v2/questionnaires/history/${sessionId}/pdf/generate`,
        requestOptions
    );
}

export function getQuestionnaireHistoryPdfV2(sessionId: string) {
    return apiGet<unknown>(`/api/v2/questionnaires/history/${sessionId}/pdf`, requestOptions).then(normalizePdfInfo);
}

export async function downloadQuestionnaireHistoryPdfV2(sessionId: string): Promise<DownloadPdfResult> {
    const result = await apiGetBlobWithMeta(
        `/api/v2/questionnaires/history/${sessionId}/pdf/download`,
        requestOptions
    );
    const filename = extractFilenameFromHeaders(result.headers) ?? `cuestionario-${sessionId}.pdf`;
    return {
        blob: result.blob,
        filename
    };
}

export function getSharedQuestionnaireV2(questionnaireId: string, shareCode: string) {
    return apiGet<unknown>(`/api/v2/questionnaires/shared/${questionnaireId}/${shareCode}`).then(
        normalizeSharedQuestionnaire
    );
}
