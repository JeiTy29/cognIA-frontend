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
const sessionDefaultPageSize = 20;

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

function firstNonEmptyString(candidates: unknown[]) {
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            return candidate.trim();
        }
    }
    return null;
}

function normalizeTagVisibility(value: unknown): QuestionnaireTagDTO['visibility'] {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'private') return 'private';
    if (normalized === 'shared') return 'shared';
    return null;
}

function toVisibilityLabel(visibility: QuestionnaireTagDTO['visibility']): QuestionnaireTagDTO['visibility_label'] {
    if (visibility === 'private') return 'Privado';
    if (visibility === 'shared') return 'Compartido';
    return '--';
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

function getSessionLikeId(record: Record<string, unknown>) {
    const candidates = [record.id, record.session_id, record.questionnaire_session_id, record.history_id];
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            return candidate.trim();
        }
    }
    return '';
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
    const idCandidates = [
        record.id,
        record.question_id,
        record.item_id,
        record.questionnaire_item_id
    ];
    let id: string | null = null;
    for (const candidate of idCandidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            id = candidate.trim();
            break;
        }
    }

    const textCandidates = [
        record.text,
        record.prompt,
        record.question_text,
        record.question,
        record.statement,
        record.title,
        record.label
    ];
    let text: string | null = null;
    for (const candidate of textCandidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            text = candidate.trim();
            break;
        }
    }
    if (!id || !text) return null;

    const responseTypeCandidates = [
        record.response_type,
        record.answer_type,
        record.input_type,
        record.type
    ];
    let responseType: string = 'text';
    for (const candidate of responseTypeCandidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            responseType = candidate;
            break;
        }
    }

    const responseOptions =
        Array.isArray(record.response_options) ? record.response_options :
            Array.isArray(record.options) ? record.options :
                Array.isArray(record.choices) ? record.choices :
                    Array.isArray(record.values) ? record.values :
                        null;

    return {
        ...record,
        id,
        text,
        response_type: responseType,
        response_options: responseOptions
    } as QuestionnaireQuestionV2DTO;
}

function normalizeTag(value: unknown): QuestionnaireTagDTO | null {
    const record = asRecord(value);
    if (!record) return null;

    const id = firstNonEmptyString([record.id, record.tag_id, record.uuid]);
    const label =
        firstNonEmptyString([
            record.label,
            record.tag,
            record.name,
            record.text,
            record.title
        ]) ?? '--';
    const color = firstNonEmptyString([record.color, record.color_hex, record.hex, record.bg_color]);
    const visibility = normalizeTagVisibility(
        firstNonEmptyString([record.visibility, record.share_visibility, record.access])
    );

    return {
        ...record,
        id: id ?? undefined,
        tag_id: id ?? undefined,
        label,
        tag: label,
        color: color ?? null,
        visibility,
        visibility_label: toVisibilityLabel(visibility),
        created_at: firstNonEmptyString([record.created_at, record.createdAt]),
        updated_at: firstNonEmptyString([record.updated_at, record.updatedAt])
    };
}

function normalizeSession(payload: unknown): QuestionnaireSessionV2DTO {
    const record = pickRecord(payload, ['session', 'item', 'data', 'result']);
    if (!record) {
        return { id: '' };
    }

    const id = getSessionLikeId(record);

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
    const root = asRecord(payload);
    if (!root) {
        return {
            items: [],
            pagination: normalizePagination(null, page, pageSize)
        };
    }

    const pagesArray = asArray(root.pages)
        .map(asRecord)
        .filter((candidate): candidate is Record<string, unknown> => Boolean(candidate));
    const requestedPage = pagesArray.find((candidate) => {
        const pageNumber = Number(candidate.page_number ?? candidate.page);
        return Number.isFinite(pageNumber) && pageNumber === page;
    }) ?? pagesArray[0] ?? null;
    const allQuestionsFromPages = pagesArray
        .flatMap((candidate) => asArray(candidate.questions))
        .map(normalizeQuestion)
        .filter((item): item is QuestionnaireQuestionV2DTO => Boolean(item));

    const containerCandidates: Record<string, unknown>[] = [
        root,
        asRecord(root.data),
        asRecord(root.result),
        asRecord(root.page),
        asRecord(root.session_page),
        requestedPage
    ].filter((candidate): candidate is Record<string, unknown> => Boolean(candidate));

    const arrayCandidates: unknown[] = [
        root.data,
        root.items,
        root.questions,
        requestedPage ? requestedPage.questions : undefined
    ];

    for (const container of containerCandidates) {
        arrayCandidates.push(
            container.items,
            container.questions,
            container.page_items,
            container.question_items,
            container.rows,
            container.questions
        );
    }

    // Si el backend ya devolvio un bloque "pages[]" con preguntas, priorizamos ese
    // arreglo consolidado para no quedarnos solo con la primera pagina.
    let normalizedItems: QuestionnaireQuestionV2DTO[] = allQuestionsFromPages;

    if (normalizedItems.length === 0) {
        for (const candidate of arrayCandidates) {
            const parsed = asArray(candidate)
                .map(normalizeQuestion)
                .filter((item): item is QuestionnaireQuestionV2DTO => Boolean(item));
            if (parsed.length > 0) {
                normalizedItems = parsed;
                break;
            }
        }
    }

    const derivedPaginationFromPages =
        requestedPage || pagesArray.length > 0
            ? {
                page: Number(requestedPage?.page_number ?? requestedPage?.page ?? page),
                page_size: Number(requestedPage?.page_size ?? pageSize),
                total: Number(
                    root.total ??
                    root.total_items ??
                    (pagesArray.length > 0
                        ? pagesArray.reduce((acc, candidate) => acc + asArray(candidate.questions).length, 0)
                        : normalizedItems.length)
                ),
                pages: Number(
                    root.pages_total ??
                    root.total_pages ??
                    root.page_count ??
                    root.pages_count ??
                    pagesArray.length ??
                    1
                )
            }
            : null;

    const paginationSource =
        asRecord(root.pagination) ??
        asRecord((asRecord(root.data) ?? {}).pagination) ??
        asRecord((asRecord(root.result) ?? {}).pagination) ??
        asRecord((requestedPage ?? {}).pagination) ??
        asRecord((asRecord(root.meta) ?? {}).pagination) ??
        derivedPaginationFromPages ??
        asRecord(root.page) ??
        root;

    const normalizedPagination = normalizePagination(paginationSource, page, pageSize);

    return {
        items: normalizedItems,
        pagination:
            allQuestionsFromPages.length > 0 && pagesArray.length > 1
                ? {
                    ...normalizedPagination,
                    page: 1,
                    pages: 1,
                    total: normalizedItems.length
                }
                : normalizedPagination
    };
}

function normalizeHistoryItem(value: unknown): QuestionnaireHistoryDetailV2DTO | null {
    const record = pickRecord(value, ['session', 'history', 'item', 'data', 'result']);
    if (!record) return null;

    const id = getSessionLikeId(record);
    if (!id) return null;

    const questionnaireIdCandidates = [record.questionnaire_id, record.questionnaireId, record.template_id];
    let questionnaireId: string | null = null;
    for (const candidate of questionnaireIdCandidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            questionnaireId = candidate.trim();
            break;
        }
    }

    return {
        ...record,
        id,
        session_id:
            typeof record.session_id === 'string'
                ? record.session_id
                : typeof record.questionnaire_session_id === 'string'
                    ? record.questionnaire_session_id
                    : id,
        questionnaire_session_id:
            typeof record.questionnaire_session_id === 'string'
                ? record.questionnaire_session_id
                : typeof record.session_id === 'string'
                    ? record.session_id
                    : id,
        questionnaire_id: questionnaireId
    } as QuestionnaireHistoryDetailV2DTO;
}

function normalizeHistoryResponse(payload: unknown, page: number, pageSize: number): QuestionnaireHistoryListV2Response {
    const root = pickRecord(payload, ['data', 'result']);
    if (!root) {
        return {
            items: [],
            pagination: normalizePagination(null, page, pageSize)
        };
    }

    const items = asArray(root.items)
        .map(normalizeHistoryItem)
        .filter((item): item is QuestionnaireHistoryDetailV2DTO => Boolean(item));
    return {
        items: items as QuestionnaireHistoryListV2Response['items'],
        pagination: normalizePagination(root.pagination, page, pageSize)
    };
}

function normalizeHistoryDetail(payload: unknown): QuestionnaireHistoryDetailV2DTO {
    const root = pickRecord(payload, ['history', 'item', 'session', 'data', 'result']);
    if (!root) {
        return { id: '' };
    }

    const tagsSource = asArray(root.tags).length > 0 ? root.tags : root.labels;
    const tags = asArray(tagsSource).map(normalizeTag).filter((item): item is QuestionnaireTagDTO => Boolean(item));
    const id = getSessionLikeId(root);
    return {
        ...root,
        id,
        session_id:
            typeof root.session_id === 'string'
                ? root.session_id
                : typeof root.questionnaire_session_id === 'string'
                    ? root.questionnaire_session_id
                    : id,
        questionnaire_session_id:
            typeof root.questionnaire_session_id === 'string'
                ? root.questionnaire_session_id
                : typeof root.session_id === 'string'
                    ? root.session_id
                    : id,
        tags
    } as QuestionnaireHistoryDetailV2DTO;
}

function normalizeResults(payload: unknown): Record<string, unknown> {
    const root = pickRecord(payload, ['results', 'result', 'data']);
    return root ?? {};
}

function normalizeShareResponse(payload: unknown): QuestionnaireShareResponseDTO {
    const source = asRecord(payload);
    if (!source) return {};
    const wrapper =
        asRecord(source.share) ??
        asRecord(source.data) ??
        asRecord(source.result) ??
        null;
    const root: Record<string, unknown> = wrapper ? { ...source, ...wrapper } : source;

    const questionnaireId =
        firstNonEmptyString([
            root.questionnaire_id,
            root.questionnaireId,
            asRecord(root.questionnaire)?.id,
            asRecord(root.questionnaire)?.questionnaire_id
        ]) ?? undefined;

    const shareCode =
        firstNonEmptyString([
            root.share_code,
            root.shareCode,
            root.code,
            root.token
        ]) ?? undefined;

    const sharedPath =
        questionnaireId && shareCode
            ? `/cuestionario/compartido/${questionnaireId}/${shareCode}`
            : undefined;

    const sharedUrl =
        firstNonEmptyString([
            root.url,
            root.share_url,
            root.public_url,
            root.link,
            root.share_link,
            root.public_link
        ]) ?? sharedPath ?? undefined;

    return {
        ...root,
        questionnaire_id: questionnaireId,
        share_code: shareCode,
        shared_path: sharedPath,
        shared_url: sharedUrl,
        url: sharedUrl
    } as QuestionnaireShareResponseDTO;
}

function normalizePdfInfo(payload: unknown): QuestionnairePdfInfoV2DTO {
    const root = pickRecord(payload, ['pdf', 'data', 'result']);
    return (root ?? {}) as QuestionnairePdfInfoV2DTO;
}

function normalizeSharedQuestionnaire(payload: unknown): QuestionnaireSharedDataV2DTO {
    const source = asRecord(payload);
    if (!source) return {};
    const wrapper =
        asRecord(source.shared) ??
        asRecord(source.data) ??
        asRecord(source.result) ??
        null;
    const root: Record<string, unknown> = wrapper ? { ...source, ...wrapper } : source;

    const questionnaireInfo = asRecord(root.questionnaire);
    const summaryRecord =
        asRecord(root.summary) ??
        asRecord(root.results_summary) ??
        asRecord(questionnaireInfo?.summary) ??
        null;
    const resultsRecord =
        asRecord(root.results) ??
        asRecord(root.result) ??
        asRecord(root.scores) ??
        asRecord(root.output) ??
        summaryRecord;
    const metadataRecord =
        asRecord(root.metadata) ??
        asRecord(questionnaireInfo?.metadata) ??
        null;
    const tagsSource = asArray(root.tags).length > 0 ? root.tags : root.labels;
    const tags = asArray(tagsSource)
        .map(normalizeTag)
        .filter((item): item is QuestionnaireTagDTO => Boolean(item));

    const questionnaireId =
        firstNonEmptyString([
            root.questionnaire_id,
            root.questionnaireId,
            questionnaireInfo?.id,
            questionnaireInfo?.questionnaire_id
        ]) ?? undefined;
    const shareCode =
        firstNonEmptyString([
            root.share_code,
            root.shareCode
        ]) ?? undefined;
    const sharedPath =
        questionnaireId && shareCode
            ? `/cuestionario/compartido/${questionnaireId}/${shareCode}`
            : undefined;
    const sharedUrl =
        firstNonEmptyString([
            root.url,
            root.share_url,
            root.public_url,
            root.link
        ]) ?? sharedPath ?? undefined;

    return {
        ...root,
        questionnaire_id: questionnaireId,
        share_code: shareCode,
        shared_url: sharedUrl,
        name:
            firstNonEmptyString([
                root.name,
                root.title,
                questionnaireInfo?.name,
                questionnaireInfo?.title
            ]) ?? undefined,
        title:
            firstNonEmptyString([
                root.title,
                root.name,
                questionnaireInfo?.title,
                questionnaireInfo?.name
            ]) ?? undefined,
        status: firstNonEmptyString([root.status, questionnaireInfo?.status]) ?? undefined,
        mode: (firstNonEmptyString([root.mode, questionnaireInfo?.mode]) ?? undefined) as QuestionnaireSharedDataV2DTO['mode'],
        role: (firstNonEmptyString([root.role, questionnaireInfo?.role]) ?? undefined) as QuestionnaireSharedDataV2DTO['role'],
        version: firstNonEmptyString([root.version, questionnaireInfo?.version]) ?? undefined,
        created_at: firstNonEmptyString([root.created_at, root.createdAt, questionnaireInfo?.created_at]) ?? undefined,
        updated_at: firstNonEmptyString([root.updated_at, root.updatedAt, questionnaireInfo?.updated_at]) ?? undefined,
        expires_at: firstNonEmptyString([root.expires_at, root.expiresAt]) ?? undefined,
        tags,
        results: resultsRecord,
        summary: summaryRecord,
        metadata: metadataRecord
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
    const queryWithPageSize = buildSearch({ page, page_size: pageSize });
    const pathWithPageSize = `/api/v2/questionnaires/sessions/${sessionId}/page?${queryWithPageSize}`;
    return apiGet<unknown>(pathWithPageSize, requestOptions).then((payload) =>
        normalizeSessionPageResponse(payload, page, pageSize)
    );
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
