import {
    apiDelete,
    apiGet,
    apiGetBlobWithMeta,
    apiPatch,
    apiPost,
    apiPostNoBody,
    apiSecurePatch,
    apiSecurePost,
    apiSecurePostNoBody
} from '../api/httpClient';
import {
    getEncryptedTransportEnabled,
    getRequireEncryptedSensitivePayloads
} from '../api/policy';
import type {
    ActiveQuestionnairesV2Response,
    AddQuestionnaireTagPayload,
    CreateQuestionnaireSessionV2Payload,
    DownloadPdfResult,
    PatchSessionAnswersV2Payload,
    QuestionnaireCaseDetailV2Response,
    QuestionnaireCaseV2DTO,
    QuestionnaireCasesFiltersV2,
    QuestionnaireCasesListV2Response,
    QuestionnaireDashboardChartPointDTO,
    QuestionnaireGuardianDashboardFiltersV2,
    QuestionnaireGuardianDashboardV2Response,
    QuestionnaireHistoryDetailV2DTO,
    QuestionnaireHistoryFiltersV2,
    QuestionnaireHistoryListV2Response,
    QuestionnaireHistoryResponseItemDTO,
    QuestionnaireHistoryResponsesV2Response,
    QuestionnaireNotificationsV2Response,
    QuestionnaireClinicalComorbidityV2DTO,
    QuestionnaireClinicalDomainV2DTO,
    QuestionnaireClinicalNarrativeV2DTO,
    QuestionnaireClinicalSectionV2DTO,
    QuestionnaireClinicalSummaryV2DTO,
    QuestionnairePdfInfoV2DTO,
    QuestionnaireSecureResultsV2DTO,
    QuestionnaireSubmitResponseV2DTO,
    QuestionnaireQuestionV2DTO,
    QuestionnaireSessionPageV2Response,
    QuestionnaireSessionV2DTO,
    QuestionnaireReportPreviewDTO,
    QuestionnaireProfessionalReviewDTO,
    QuestionnairePsychologistDashboardFiltersV2,
    QuestionnairePsychologistDashboardV2Response,
    QuestionnairePsychologistShareRequestV2DTO,
    QuestionnairePsychologistShareRequestsV2Response,
    QuestionnaireObservedIndicatorDTO,
    GuardianDashboardDTO,
    PsychologistDashboardDTO,
    PsychologistSearchItemDTO,
    PsychologistSearchResponseDTO,
    QuestionnaireSharedComorbidityDTO,
    QuestionnaireSharedDomainDTO,
    QuestionnaireShareResponseDTO,
    QuestionnaireSharedResultDTO,
    QuestionnaireSharedSessionDTO,
    QuestionnaireSharedDataV2DTO,
    QuestionnaireTagDTO,
    QuestionnaireTemplateV2DTO,
    QuestionnaireV2Mode,
    QuestionnaireV2Role,
    ShareQuestionnairePayload
} from './questionnaires.types';
import {
    getDemoGuardianDashboardV2,
    getDemoPsychologistDashboard,
    getDemoPsychologistDashboardV2,
    getDemoQuestionnaireCaseDetail,
    getDemoQuestionnaireCasesResponse,
    getDemoQuestionnaireHistoryDetail,
    getDemoQuestionnaireHistoryResponse,
    getDemoQuestionnairePdfInfo,
    getDemoQuestionnaireShareResponse,
    getDemoShareRequests,
    isDevDashboardDemoEnabled
} from '../../utils/questionnaires/demoDashboardData';
import { resolveQuestionnaireTagColor } from '../../utils/questionnaires/tags';

const requestOptions = {
    auth: true,
    credentials: 'include' as const
};

const dashboardRequestOptions = {
    ...requestOptions,
    timeoutMs: 45_000
};

const publicRequestOptions = {
    credentials: 'include' as const
};

const encryptedTransportEnabled = getEncryptedTransportEnabled();
const requireEncryptedSensitivePayloads = getRequireEncryptedSensitivePayloads();
const sensitiveTransportEnabled = encryptedTransportEnabled || requireEncryptedSensitivePayloads;

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

function toNumberOrNull(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function toBooleanOrNull(value: unknown) {
    if (typeof value === 'boolean') return value;
    return null;
}

function toBoolean(value: unknown, fallback = false) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'si'].includes(normalized)) return true;
        if (['false', '0', 'no'].includes(normalized)) return false;
    }
    return fallback;
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

function resolveTemplateId(record: Record<string, unknown>) {
    return firstNonEmptyString([record.id, record.template_id]);
}

function resolveQuestionId(record: Record<string, unknown>) {
    return firstNonEmptyString([
        record.id,
        record.question_id,
        record.item_id,
        record.questionnaire_item_id
    ]);
}

function resolveQuestionText(record: Record<string, unknown>) {
    return firstNonEmptyString([
        record.text,
        record.prompt,
        record.question_text,
        record.question,
        record.statement,
        record.title,
        record.label
    ]);
}

function resolveQuestionResponseType(record: Record<string, unknown>) {
    return firstNonEmptyString([
        record.response_type,
        record.answer_type,
        record.input_type,
        record.type
    ]) ?? 'text';
}

function resolveQuestionResponseOptions(record: Record<string, unknown>) {
    const arrayCandidates = [
        record.response_options,
        record.options,
        record.choices,
        record.values
    ];

    for (const candidate of arrayCandidates) {
        if (Array.isArray(candidate)) {
            return candidate;
        }
    }

    return null;
}

function resolveHistorySessionId(record: Record<string, unknown>, id: string) {
    return firstNonEmptyString([record.session_id, record.questionnaire_session_id]) ?? id;
}

function resolveHistoryQuestionnaireSessionId(record: Record<string, unknown>, id: string) {
    return firstNonEmptyString([record.questionnaire_session_id, record.session_id]) ?? id;
}

function buildSinglePagePagination(
    normalizedPagination: QuestionnaireSessionPageV2Response['pagination'],
    normalizedItems: QuestionnaireSessionPageV2Response['items'],
    allQuestionsFromPages: QuestionnaireSessionPageV2Response['items'],
    pagesArray: Record<string, unknown>[]
) {
    if (!(allQuestionsFromPages.length > 0 && pagesArray.length > 1)) {
        return normalizedPagination;
    }

    return {
        ...normalizedPagination,
        page: 1,
        pages: 1,
        total: normalizedItems.length
    };
}

function normalizeTemplate(value: unknown): QuestionnaireTemplateV2DTO | null {
    const record = asRecord(value);
    if (!record) return null;
    const id = resolveTemplateId(record);
    if (!id) return null;
    return {
        ...record,
        id
    } as QuestionnaireTemplateV2DTO;
}

function normalizeQuestion(value: unknown): QuestionnaireQuestionV2DTO | null {
    const record = asRecord(value);
    if (!record) return null;
    const id = resolveQuestionId(record);
    const text = resolveQuestionText(record);
    if (!id || !text) return null;

    const responseType = resolveQuestionResponseType(record);
    const responseOptions = resolveQuestionResponseOptions(record);

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
        color: resolveQuestionnaireTagColor({ ...record, id: id ?? undefined, tag_id: id ?? undefined, label, tag: label, color: color ?? null } as QuestionnaireTagDTO),
        visibility,
        visibility_label: toVisibilityLabel(visibility),
        created_at: firstNonEmptyString([record.created_at, record.createdAt]),
        updated_at: firstNonEmptyString([record.updated_at, record.updatedAt])
    };
}

function normalizeReportPreview(value: unknown): QuestionnaireReportPreviewDTO {
    const record = asRecord(value) ?? {};
    return {
        ...record,
        domains: asArray(record.domains),
        comorbidity: asArray(record.comorbidity),
        answers: asArray(record.answers),
        professional_reviews: asArray(record.professional_reviews),
        permissions: asRecord(record.permissions),
        warnings: asArray(record.warnings).map(String),
        data_quality: asRecord(record.data_quality)
    } as QuestionnaireReportPreviewDTO;
}

function normalizeObservedIndicator(value: unknown): QuestionnaireObservedIndicatorDTO | null {
    const record = asRecord(value);
    if (!record) {
        if (typeof value === 'string' && value.trim()) {
            return { label: value.trim(), text: value.trim() };
        }
        return null;
    }

    return {
        ...record,
        code: firstNonEmptyString([record.code, record.indicator_code, record.question_code]),
        label: firstNonEmptyString([record.label, record.title, record.text, record.question_text]),
        text: firstNonEmptyString([record.text, record.question_text, record.question, record.label]),
        question: firstNonEmptyString([record.question, record.question_text, record.text]),
        question_text: firstNonEmptyString([record.question_text, record.question, record.text]),
        answer: (record.answer ?? record.answer_value ?? record.value ?? null) as QuestionnaireObservedIndicatorDTO['answer'],
        answer_label: firstNonEmptyString([record.answer_label, record.answer_text, record.response_label]),
        value: toNumberOrNull(record.value),
        score: toNumberOrNull(record.score),
        domain: firstNonEmptyString([record.domain, record.domain_code]),
        domain_code: firstNonEmptyString([record.domain_code, record.domain]),
        domain_label: firstNonEmptyString([record.domain_label])
    };
}

function normalizeHistoryResponseItem(value: unknown): QuestionnaireHistoryResponseItemDTO | null {
    const record = asRecord(value);
    if (!record) return null;
    return {
        ...record,
        question_id: firstNonEmptyString([record.question_id, record.id]),
        question_code: firstNonEmptyString([record.question_code, record.code]),
        code: firstNonEmptyString([record.code, record.question_code]),
        prompt: firstNonEmptyString([record.prompt, record.question_text, record.question, record.text, record.label]),
        question: firstNonEmptyString([record.question, record.question_text, record.prompt, record.text]),
        question_text: firstNonEmptyString([record.question_text, record.question, record.prompt, record.text]),
        text: firstNonEmptyString([record.text, record.question_text, record.question, record.prompt]),
        section: firstNonEmptyString([record.section, record.section_key]),
        section_title: firstNonEmptyString([record.section_title, record.section_label, record.domain_label]),
        domain: firstNonEmptyString([record.domain, record.domain_code]),
        domain_code: firstNonEmptyString([record.domain_code, record.domain]),
        domain_label: firstNonEmptyString([record.domain_label]),
        answer: (record.answer ?? record.answer_value ?? record.value ?? null) as QuestionnaireHistoryResponseItemDTO['answer'],
        answer_value: (record.answer_value ?? record.answer ?? record.value ?? null) as QuestionnaireHistoryResponseItemDTO['answer_value'],
        answer_label: firstNonEmptyString([record.answer_label, record.answer_text, record.response_label]),
        value: (record.value ?? record.answer_value ?? record.answer ?? null) as QuestionnaireHistoryResponseItemDTO['value'],
        missing: toBooleanOrNull(record.missing ?? record.is_missing),
        is_missing: toBooleanOrNull(record.is_missing ?? record.missing)
    };
}

function asCollectionArray(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    const record = asRecord(value);
    if (!record) return [];
    return Object.values(record);
}

function collectHistoryResponseItems(root: Record<string, unknown>) {
    const directItems = asCollectionArray(root.items ?? root.responses ?? root.answers ?? root.data);
    if (directItems.length > 0) return directItems;

    const groupedSources = asCollectionArray(root.sections ?? root.domains ?? root.groups);
    return groupedSources.flatMap((section) => {
        const sectionRecord = asRecord(section);
        if (!sectionRecord) return [];
        const sectionItems = asCollectionArray(sectionRecord.items ?? sectionRecord.responses ?? sectionRecord.answers ?? sectionRecord.questions);
        return sectionItems.map((item) => {
            const itemRecord = asRecord(item);
            if (!itemRecord) return item;
            return {
                ...sectionRecord,
                ...itemRecord,
                section: itemRecord.section ?? itemRecord.section_key ?? sectionRecord.section ?? sectionRecord.key,
                section_title: itemRecord.section_title ?? itemRecord.section_label ?? sectionRecord.section_title ?? sectionRecord.title ?? sectionRecord.label,
                domain_code: itemRecord.domain_code ?? itemRecord.domain ?? sectionRecord.domain_code ?? sectionRecord.domain,
                domain_label: itemRecord.domain_label ?? sectionRecord.domain_label ?? sectionRecord.label ?? sectionRecord.title
            };
        });
    });
}

function normalizeHistoryResponsesResponse(payload: unknown): QuestionnaireHistoryResponsesV2Response {
    if (Array.isArray(payload)) {
        return {
            items: payload
                .map(normalizeHistoryResponseItem)
                .filter((item): item is QuestionnaireHistoryResponseItemDTO => Boolean(item)),
            warnings: []
        };
    }
    const root = pickRecord(payload, ['data', 'result', 'responses']) ?? asRecord(payload);
    if (!root) {
        return {
            items: [],
            warnings: []
        };
    }
    return {
        ...root,
        session_id: firstNonEmptyString([root.session_id, root.id]),
        items: collectHistoryResponseItems(root)
            .map(normalizeHistoryResponseItem)
            .filter((item): item is QuestionnaireHistoryResponseItemDTO => Boolean(item)),
        warnings: asArray(root.warnings).map(String),
        permissions: asRecord(root.permissions)
    };
}

function normalizeProfessionalReview(value: unknown): QuestionnaireProfessionalReviewDTO | null {
    const record = asRecord(value);
    if (!record) return null;
    const reviewId = firstNonEmptyString([record.review_id, record.id, record.uuid]);
    if (!reviewId) return null;
    return {
        ...record,
        review_id: reviewId,
        session_id: firstNonEmptyString([record.session_id]),
        case_id: firstNonEmptyString([record.case_id])
    } as QuestionnaireProfessionalReviewDTO;
}

function normalizePsychologistSearchItem(value: unknown, index: number): PsychologistSearchItemDTO | null {
    const record = asRecord(value);
    if (!record) return null;
    const userId = firstNonEmptyString([record.user_id, record.id, record.uuid]) ?? `user-${index + 1}`;
    return {
        ...record,
        user_id: userId
    } as PsychologistSearchItemDTO;
}

function normalizeSession(payload: unknown): QuestionnaireSessionV2DTO {
    const record = pickRecord(payload, ['session', 'item', 'data', 'result']);
    if (!record) {
        return { id: '' };
    }

    const id = getSessionLikeId(record);
    const resultPayload = asRecord(record.result) ?? asRecord(record.results);
    const result = normalizeEvaluationResult(
        resultPayload ??
        (firstNonEmptyString([record.summary, record.operational_recommendation]) ? record : null)
    );

    return {
        ...record,
        id,
        session_id:
            firstNonEmptyString([record.session_id, record.id, record.questionnaire_session_id]) ?? id,
        questionnaire_id: firstNonEmptyString([record.questionnaire_id, record.questionnaireId]) ?? undefined,
        mode_key: firstNonEmptyString([record.mode_key]),
        progress_pct: toNumberOrNull(record.progress_pct),
        version: firstNonEmptyString([record.version]),
        submitted_at: firstNonEmptyString([record.submitted_at]),
        applied_at: firstNonEmptyString([record.applied_at]),
        completed_by_user_id: firstNonEmptyString([record.completed_by_user_id]),
        completed_by_display_name: firstNonEmptyString([record.completed_by_display_name]),
        completed_by_role: firstNonEmptyString([record.completed_by_role]),
        respondent_relationship: firstNonEmptyString([record.respondent_relationship]),
        result,
        domains: normalizeEvaluationDomains(record.domains ?? resultPayload?.domains),
        comorbidity: normalizeEvaluationComorbidity(record.comorbidity ?? resultPayload?.comorbidity),
        metadata: asRecord(record.metadata)
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
    let items = directItems;
    if (items.length === 0) {
        items = alternativeItems;
    }
    if (items.length === 0 && fallbackTemplate) {
        items = [fallbackTemplate];
    }

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
        asRecord(asRecord(root.data)?.pagination) ??
        asRecord(asRecord(root.result)?.pagination) ??
        asRecord(requestedPage?.pagination) ??
        asRecord(asRecord(root.meta)?.pagination) ??
        derivedPaginationFromPages ??
        asRecord(root.page) ??
        root;

    const normalizedPagination = normalizePagination(paginationSource, page, pageSize);

    return {
        items: normalizedItems,
        pagination: buildSinglePagePagination(normalizedPagination, normalizedItems, allQuestionsFromPages, pagesArray)
    };
}

function normalizeChartPoint(value: unknown): QuestionnaireDashboardChartPointDTO | null {
    const record = asRecord(value);
    if (!record) return null;
    return {
        ...record,
        key: firstNonEmptyString([record.key, record.id, record.case_id, record.case_public_id]),
        label: firstNonEmptyString([record.label, record.name, record.domain, record.alert_level, record.month, record.date]),
        name: firstNonEmptyString([record.name, record.label]),
        date: firstNonEmptyString([record.date]),
        month: firstNonEmptyString([record.month]),
        domain: firstNonEmptyString([record.domain]),
        alert_level: firstNonEmptyString([record.alert_level]),
        value: toNumberOrNull(record.value ?? record.count ?? record.total ?? record.sessions),
        count: toNumberOrNull(record.count ?? record.value ?? record.total),
        sessions: toNumberOrNull(record.sessions),
        total: toNumberOrNull(record.total ?? record.count ?? record.value)
    } as QuestionnaireDashboardChartPointDTO;
}

function normalizeChartPoints(value: unknown) {
    return asArray(value)
        .map(normalizeChartPoint)
        .filter((item): item is QuestionnaireDashboardChartPointDTO => Boolean(item));
}

function normalizeCase(value: unknown): QuestionnaireCaseV2DTO | null {
    const record = asRecord(value);
    if (!record) return null;
    const caseId = firstNonEmptyString([record.case_id, record.id, record.case_public_id]);
    if (!caseId) return null;

    const tags = asArray(record.tags)
        .map((item) => {
            if (typeof item === 'string') return item.trim();
            const tag = normalizeTag(item);
            return tag ?? null;
        })
        .filter((item): item is QuestionnaireTagDTO | string => Boolean(item));

    return {
        ...record,
        case_id: caseId,
        case_public_id: firstNonEmptyString([record.case_public_id]),
        private_label: firstNonEmptyString([record.private_label]),
        display_label: firstNonEmptyString([record.display_label, record.case_label, record.private_label]),
        status: firstNonEmptyString([record.status]),
        sessions_count: toNumberOrNull(record.sessions_count),
        processed_sessions_count: toNumberOrNull(record.processed_sessions_count),
        draft_sessions_count: toNumberOrNull(record.draft_sessions_count),
        in_progress_sessions_count: toNumberOrNull(record.in_progress_sessions_count),
        latest_session_id: firstNonEmptyString([record.latest_session_id]),
        latest_processed_at: firstNonEmptyString([record.latest_processed_at]),
        latest_alert_level: firstNonEmptyString([record.latest_alert_level]),
        latest_domain: firstNonEmptyString([record.latest_domain, record.dominant_domain]),
        tags
    };
}

function normalizeCasesResponse(payload: unknown, page: number, pageSize: number): QuestionnaireCasesListV2Response {
    const root = pickRecord(payload, ['data', 'result']) ?? asRecord(payload);
    if (!root) {
        return {
            items: [],
            pagination: normalizePagination(null, page, pageSize),
            warnings: []
        };
    }

    const items = asArray(root.items ?? root.cases)
        .map(normalizeCase)
        .filter((item): item is QuestionnaireCaseV2DTO => Boolean(item));
    return {
        ...root,
        items,
        pagination: normalizePagination(root.pagination, page, pageSize),
        warnings: asArray(root.warnings).map(String)
    } as QuestionnaireCasesListV2Response;
}

function normalizeCaseDetailResponse(payload: unknown): QuestionnaireCaseDetailV2Response {
    const root = pickRecord(payload, ['data', 'result']) ?? asRecord(payload);
    if (!root) {
        return {
            case: null,
            sessions: [],
            domain_summary: [],
            trend: [],
            warnings: []
        };
    }

    const sessions = asArray(root.sessions)
        .map(normalizeHistoryItem)
        .filter((item): item is QuestionnaireHistoryDetailV2DTO => Boolean(item));

    return {
        ...root,
        case: normalizeCase(root.case),
        sessions,
        domain_summary: normalizeChartPoints(root.domain_summary),
        trend: normalizeChartPoints(root.trend),
        warnings: asArray(root.warnings).map(String)
    };
}

function normalizeGuardianDashboardResponse(payload: unknown): QuestionnaireGuardianDashboardV2Response {
    const root = pickRecord(payload, ['data', 'result']) ?? asRecord(payload);
    if (!root) {
        return {
            period: null,
            filters: null,
            summary: null,
            charts: null,
            cases: [],
            warnings: []
        };
    }

    const charts = asRecord(root.charts);
    return {
        ...root,
        period: asRecord(root.period),
        filters: asRecord(root.filters),
        summary: asRecord(root.summary),
        charts: charts
            ? {
                alerts_by_month: normalizeChartPoints(charts.alerts_by_month),
                alerts_by_domain: normalizeChartPoints(charts.alerts_by_domain),
                alerts_by_level: normalizeChartPoints(charts.alerts_by_level),
                sessions_by_case: normalizeChartPoints(charts.sessions_by_case),
                cases_by_alert_level: normalizeChartPoints(charts.cases_by_alert_level)
            }
            : null,
        cases: asArray(root.cases).map(normalizeCase).filter((item): item is QuestionnaireCaseV2DTO => Boolean(item)),
        warnings: asArray(root.warnings).map(String)
    };
}

function normalizePsychologistDashboardResponse(payload: unknown): QuestionnairePsychologistDashboardV2Response {
    const root = pickRecord(payload, ['data', 'result']) ?? asRecord(payload);
    if (!root) {
        return {
            filters: null,
            summary: null,
            aggregates: null,
            charts: null,
            items: [],
            pagination: normalizePagination(null),
            warnings: []
        };
    }

    const aggregates = asRecord(root.aggregates);
    const charts = asRecord(root.charts);
    const page = Number(root.page ?? asRecord(root.pagination)?.page ?? 1);
    const pageSize = Number(root.page_size ?? asRecord(root.pagination)?.page_size ?? defaultPageSize);
    const items = asArray(root.items)
        .map(normalizeHistoryItem)
        .filter((item): item is QuestionnaireHistoryDetailV2DTO => Boolean(item));

    return {
        ...root,
        filters: asRecord(root.filters),
        summary: asRecord(root.summary),
        aggregates: aggregates
            ? {
                by_domain: normalizeChartPoints(aggregates.by_domain),
                by_alert_level: normalizeChartPoints(aggregates.by_alert_level),
                by_review_status: normalizeChartPoints(aggregates.by_review_status),
                by_date: normalizeChartPoints(aggregates.by_date),
                by_case: normalizeChartPoints(aggregates.by_case)
            }
            : null,
        charts: charts
            ? {
                alerts_by_domain: normalizeChartPoints(charts.alerts_by_domain),
                alerts_by_level: normalizeChartPoints(charts.alerts_by_level),
                reviews_by_status: normalizeChartPoints(charts.reviews_by_status),
                alerts_by_date: normalizeChartPoints(charts.alerts_by_date),
                cases_by_alert: normalizeChartPoints(charts.cases_by_alert)
            }
            : null,
        items,
        pagination: normalizePagination(root.pagination, page, pageSize),
        warnings: asArray(root.warnings).map(String)
    };
}

function normalizeShareRequest(value: unknown): QuestionnairePsychologistShareRequestV2DTO | null {
    const record = asRecord(value);
    if (!record) return null;
    const grantId = firstNonEmptyString([record.grant_id, record.id]);
    if (!grantId) return null;
    return {
        ...record,
        grant_id: grantId,
        status: firstNonEmptyString([record.status]),
        case_id: firstNonEmptyString([record.case_id]),
        case_public_id: firstNonEmptyString([record.case_public_id]),
        case_display_label: firstNonEmptyString([record.case_display_label, record.display_label]),
        case_private_label: firstNonEmptyString([record.case_private_label, record.private_label]),
        latest_alert_level: firstNonEmptyString([record.latest_alert_level]),
        dominant_domain: firstNonEmptyString([record.dominant_domain, record.latest_domain]),
        needs_professional_review: toBooleanOrNull(record.needs_professional_review),
        created_at: firstNonEmptyString([record.created_at]),
        updated_at: firstNonEmptyString([record.updated_at]),
        can_tag: toBoolean(record.can_tag, false),
        can_download_pdf: toBoolean(record.can_download_pdf, false)
    };
}

function normalizeShareRequestsResponse(payload: unknown, page: number, pageSize: number): QuestionnairePsychologistShareRequestsV2Response {
    const root = pickRecord(payload, ['data', 'result']) ?? asRecord(payload);
    if (!root) {
        return {
            items: [],
            pagination: normalizePagination(null, page, pageSize),
            warnings: []
        };
    }
    const itemsSource = root.items ?? root.requests ?? root.share_requests ?? root.grants ?? root.data;
    const items = asArray(itemsSource)
        .map(normalizeShareRequest)
        .filter((item): item is QuestionnairePsychologistShareRequestV2DTO => Boolean(item));
    const chartsRoot = asRecord(root.charts);
    return {
        ...root,
        items,
        pagination: normalizePagination(root.pagination, page, pageSize),
        summary: asRecord(root.summary),
        charts: chartsRoot
            ? {
                by_status: normalizeChartPoints(chartsRoot.by_status),
                by_alert_level: normalizeChartPoints(chartsRoot.by_alert_level),
                by_domain: normalizeChartPoints(chartsRoot.by_domain),
                over_time: normalizeChartPoints(chartsRoot.over_time),
                pending_age: normalizeChartPoints(chartsRoot.pending_age)
            }
            : null,
        warnings: asArray(root.warnings).map(String)
    } as QuestionnairePsychologistShareRequestsV2Response;
}

function normalizeNotificationsResponse(payload: unknown): QuestionnaireNotificationsV2Response {
    const root = pickRecord(payload, ['data', 'result']) ?? asRecord(payload);
    if (!root) {
        return {
            items: [],
            pagination: normalizePagination(null)
        };
    }
    const items = asArray(root.items)
        .map(asRecord)
        .filter((item): item is Record<string, unknown> => Boolean(item))
        .map((item, index) => ({
            ...item,
            notification_id: firstNonEmptyString([item.notification_id, item.id]) ?? `notification-${index}`,
            type: firstNonEmptyString([item.type]),
            title: firstNonEmptyString([item.title]),
            message: firstNonEmptyString([item.message, item.body]),
            is_read: toBooleanOrNull(item.is_read),
            created_at: firstNonEmptyString([item.created_at])
        }));
    return {
        ...root,
        items,
        pagination: normalizePagination(root.pagination)
    } as QuestionnaireNotificationsV2Response;
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

    const tags = asArray(record.tags)
        .map((item) => {
            if (typeof item === 'string') return item.trim();
            return normalizeTag(item);
        })
        .filter((item): item is QuestionnaireTagDTO | string => Boolean(item));

    return {
        ...record,
        id,
        session_id: resolveHistorySessionId(record, id),
        questionnaire_session_id: resolveHistoryQuestionnaireSessionId(record, id),
        questionnaire_id: questionnaireId,
        case_id: firstNonEmptyString([record.case_id]),
        case_public_id: firstNonEmptyString([record.case_public_id]),
        case_display_label: firstNonEmptyString([record.case_display_label, record.display_label, record.case_label]),
        case_private_label: firstNonEmptyString([record.case_private_label, record.private_label]),
        tags,
        latest_alert_level: firstNonEmptyString([record.latest_alert_level]),
        dominant_domain: firstNonEmptyString([record.dominant_domain, record.latest_domain]),
        needs_professional_review: toBooleanOrNull(record.needs_professional_review),
        submitted_at: firstNonEmptyString([record.submitted_at]),
        processed_at: firstNonEmptyString([record.processed_at]),
        applied_at: firstNonEmptyString([record.applied_at]),
        completed_by_user_id: firstNonEmptyString([record.completed_by_user_id]),
        completed_by_display_name: firstNonEmptyString([record.completed_by_display_name]),
        completed_by_role: firstNonEmptyString([record.completed_by_role]),
        respondent_relationship: firstNonEmptyString([record.respondent_relationship]),
        safety_flags: asArray(record.safety_flags).map(String),
        urgent_referral_recommended: toBooleanOrNull(record.urgent_referral_recommended),
        inconsistency_flags: asArray(record.inconsistency_flags).map(String),
        score_label: firstNonEmptyString([record.score_label]),
        score_explanation: firstNonEmptyString([record.score_explanation]),
        permissions: asRecord(record.permissions),
        safety_signal_items: asArray(record.safety_signal_items).map(String),
        clinical_consistency_warnings: asArray(record.clinical_consistency_warnings).map(String),
        developmental_context_notes: Array.isArray(record.developmental_context_notes)
            ? asArray(record.developmental_context_notes).map(String)
            : firstNonEmptyString([record.developmental_context_notes])
    } as QuestionnaireHistoryDetailV2DTO;
}

function normalizeHistoryResponse(payload: unknown, page: number, pageSize: number): QuestionnaireHistoryListV2Response {
    const root = pickRecord(payload, ['data', 'result']);
    if (!root) {
        return {
            items: [],
            pagination: normalizePagination(null, page, pageSize),
            filters: null,
            summary: null,
            charts: null
        };
    }

    const items = asArray(root.items)
        .map(normalizeHistoryItem)
        .filter((item): item is QuestionnaireHistoryDetailV2DTO => Boolean(item));
    const chartsRoot = asRecord(root.charts);
    return {
        ...root,
        items: items as QuestionnaireHistoryListV2Response['items'],
        pagination: normalizePagination(root.pagination, page, pageSize),
        filters: asRecord(root.filters),
        summary: asRecord(root.summary),
        charts: chartsRoot
            ? Object.entries(chartsRoot).reduce<Record<string, QuestionnaireDashboardChartPointDTO[]>>((acc, [key, value]) => {
                acc[key] = normalizeChartPoints(value);
                return acc;
            }, {})
            : null
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
        session_id: resolveHistorySessionId(root, id),
        questionnaire_session_id: resolveHistoryQuestionnaireSessionId(root, id),
        tags
    } as QuestionnaireHistoryDetailV2DTO;
}

function normalizeSecureResults(payload: unknown): QuestionnaireSecureResultsV2DTO {
    const payloadRecord = asRecord(payload);
    const resultsWrapper = asRecord(payloadRecord?.results);
    const root = asRecord(payloadRecord?.data) ?? (resultsWrapper?.session || resultsWrapper?.result ? resultsWrapper : payloadRecord);
    if (!root) {
        return {
            session: { id: '' },
            result: null,
            domains: [],
            comorbidity: []
        };
    }

    const sessionSource = asRecord(root.session) ?? root;
    const rawResult =
        asRecord(root.result) ??
        asRecord(root.results) ??
        (root.primary_domain || root.observed_indicators || root.summary || root.operational_recommendation ? root : null);
    const result = normalizeEvaluationResult(rawResult);
    const domains = normalizeEvaluationDomains(root.domains ?? rawResult?.domains);
    const normalizedDomains = domains.length > 0
        ? domains
        : result?.primary_domain
            ? [result.primary_domain]
            : [];
    return {
        ...root,
        session: normalizeSession(sessionSource),
        result,
        domains: normalizedDomains,
        comorbidity: normalizeEvaluationComorbidity(root.comorbidity)
    };
}

function normalizeClinicalNarrative(value: unknown): QuestionnaireClinicalNarrativeV2DTO | null {
    const record = asRecord(value);
    if (!record) return null;

    return {
        ...record,
        sintesis_general: firstNonEmptyString([record.sintesis_general]),
        niveles_de_compatibilidad: firstNonEmptyString([record.niveles_de_compatibilidad]),
        indicadores_principales_observados: firstNonEmptyString([record.indicadores_principales_observados]),
        impacto_funcional: firstNonEmptyString([record.impacto_funcional]),
        recomendacion_profesional: firstNonEmptyString([record.recomendacion_profesional]),
        aclaracion_importante: firstNonEmptyString([record.aclaracion_importante])
    };
}

function normalizeClinicalDomain(value: unknown): QuestionnaireClinicalDomainV2DTO | null {
    const record = asRecord(value);
    if (!record) return null;

    return {
        ...record,
        domain: firstNonEmptyString([record.domain]),
        probability: toNumberOrNull(record.probability),
        compatibility_level: firstNonEmptyString([record.compatibility_level]) as QuestionnaireClinicalDomainV2DTO['compatibility_level'],
        risk_level: firstNonEmptyString([record.risk_level]) as QuestionnaireClinicalDomainV2DTO['risk_level'],
        confidence_pct: toNumberOrNull(record.confidence_pct),
        confidence_band: firstNonEmptyString([record.confidence_band]),
        operational_class: firstNonEmptyString([record.operational_class]),
        caveat: firstNonEmptyString([record.caveat]),
        main_indicators: asArray(record.main_indicators).map(String)
    };
}

function normalizeClinicalComorbidity(value: unknown): QuestionnaireClinicalComorbidityV2DTO | null {
    const record = asRecord(value);
    if (!record) return null;

    return {
        ...record,
        has_comorbidity_signal: toBooleanOrNull(record.has_comorbidity_signal),
        severity: firstNonEmptyString([record.severity]),
        domains: asArray(record.domains).map(String),
        summary: firstNonEmptyString([record.summary])
    };
}

function normalizeClinicalSections(
    value: unknown
): QuestionnaireClinicalSectionV2DTO[] | Record<string, string | null> | null {
    if (Array.isArray(value)) {
        return value
            .map<QuestionnaireClinicalSectionV2DTO | null>((item) => {
                const record = asRecord(item);
                if (!record) return null;
                return {
                    ...record,
                    key: firstNonEmptyString([record.key]),
                    title: firstNonEmptyString([record.title]),
                    content: firstNonEmptyString([record.content])
                };
            })
            .filter((item): item is QuestionnaireClinicalSectionV2DTO => Boolean(item));
    }

    const record = asRecord(value);
    if (!record) return null;
    return Object.entries(record).reduce<Record<string, string | null>>((acc, [key, entryValue]) => {
        acc[key] = typeof entryValue === 'string' ? entryValue : null;
        return acc;
    }, {});
}

function normalizeClinicalSummary(payload: unknown): QuestionnaireClinicalSummaryV2DTO {
    const root = pickRecord(payload, ['data', 'result', 'summary']);
    if (!root) return {};

    return {
        ...root,
        session_id: firstNonEmptyString([root.session_id]),
        report_version: firstNonEmptyString([root.report_version]),
        generated_at: firstNonEmptyString([root.generated_at]),
        overall_risk_level: firstNonEmptyString([root.overall_risk_level]) as QuestionnaireClinicalSummaryV2DTO['overall_risk_level'],
        simulated_diagnostic_text: normalizeClinicalNarrative(root.simulated_diagnostic_text),
        sections: normalizeClinicalSections(root.sections),
        domains: asArray(root.domains).map(normalizeClinicalDomain).filter((item): item is QuestionnaireClinicalDomainV2DTO => Boolean(item)),
        comorbidity: normalizeClinicalComorbidity(root.comorbidity),
        disclaimer: firstNonEmptyString([root.disclaimer])
    };
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

function normalizeSubmitResponse(payload: unknown): QuestionnaireSubmitResponseV2DTO {
    const source = asRecord(payload);
    if (!source) return {};

    const wrapper =
        asRecord(source.data) ??
        asRecord(source.submission) ??
        asRecord(source.submit) ??
        null;
    const root: Record<string, unknown> = wrapper ? { ...source, ...wrapper } : source;
    const rawSession = asRecord(root.session);
    const status = firstNonEmptyString([root.status, rawSession?.status]) ?? undefined;
    const resultPayload =
        asRecord(root.result) ??
        asRecord(root.results) ??
        asRecord(rawSession?.result) ??
        null;
    const result = normalizeEvaluationResult(
        resultPayload ??
        (firstNonEmptyString([root.summary, root.operational_recommendation]) ? root : null)
    );

    return {
        ...root,
        session_id:
            firstNonEmptyString([
                root.session_id,
                root.questionnaire_session_id,
                rawSession?.session_id,
                rawSession?.id
            ]) ?? undefined,
        questionnaire_id:
            firstNonEmptyString([root.questionnaire_id, rawSession?.questionnaire_id, root.questionnaireId]) ??
            undefined,
        status: status as QuestionnaireSubmitResponseV2DTO['status'],
        submitted_at: firstNonEmptyString([root.submitted_at]) ?? undefined,
        processed_at: firstNonEmptyString([root.processed_at]) ?? undefined,
        result,
        domains: normalizeEvaluationDomains(root.domains ?? resultPayload?.domains),
        comorbidity: normalizeEvaluationComorbidity(root.comorbidity ?? resultPayload?.comorbidity),
        metadata: asRecord(root.metadata)
    };
}

function normalizeSharedQuestionnaire(payload: unknown): QuestionnaireSharedDataV2DTO {
    const root = asRecord(payload);
    if (!root) {
        return {
            session: null,
            result: null,
            domains: [],
            comorbidity: []
        };
    }

    const rawSession = asRecord(root.session);
    const rawResult = asRecord(root.result);
    const rawDomains = asArray(root.domains).map(asRecord).filter((item): item is Record<string, unknown> => Boolean(item));
    const rawComorbidity = asArray(root.comorbidity).map(asRecord).filter((item): item is Record<string, unknown> => Boolean(item));

    const session: QuestionnaireSharedSessionDTO | null = rawSession
        ? {
            session_id: firstNonEmptyString([rawSession.session_id, rawSession.id]) ?? '',
            questionnaire_id: firstNonEmptyString([rawSession.questionnaire_id]) ?? '',
            status: firstNonEmptyString([rawSession.status]) ?? '--',
            mode: (firstNonEmptyString([rawSession.mode]) ?? '--') as QuestionnaireSharedSessionDTO['mode'],
            role: (firstNonEmptyString([rawSession.role]) ?? '--') as QuestionnaireSharedSessionDTO['role'],
            mode_key: firstNonEmptyString([rawSession.mode_key]) ?? undefined,
            progress_pct: toNumberOrNull(rawSession.progress_pct),
            version: firstNonEmptyString([rawSession.version]),
            created_at: firstNonEmptyString([rawSession.created_at]),
            updated_at: firstNonEmptyString([rawSession.updated_at])
        }
        : null;

    const result: QuestionnaireSharedResultDTO | null = rawResult
        ? {
            summary: firstNonEmptyString([rawResult.summary]),
            operational_recommendation: firstNonEmptyString([rawResult.operational_recommendation]),
            completion_quality_score: toNumberOrNull(rawResult.completion_quality_score),
            missingness_score: toNumberOrNull(rawResult.missingness_score),
            needs_professional_review: toBooleanOrNull(rawResult.needs_professional_review)
        }
        : null;

    const domains: QuestionnaireSharedDomainDTO[] = rawDomains
        .map((domain) => {
            const domainName = firstNonEmptyString([domain.domain]);
            if (!domainName) return null;
            return {
                domain: domainName,
                probability: toNumberOrNull(domain.probability),
                alert_level: firstNonEmptyString([domain.alert_level]),
                confidence_pct: toNumberOrNull(domain.confidence_pct),
                confidence_band: firstNonEmptyString([domain.confidence_band]),
                model_id: firstNonEmptyString([domain.model_id]),
                model_version: firstNonEmptyString([domain.model_version]),
                mode: firstNonEmptyString([domain.mode]),
                operational_class: firstNonEmptyString([domain.operational_class]),
                operational_caveat: firstNonEmptyString([domain.operational_caveat]),
                result_summary: firstNonEmptyString([domain.result_summary]),
                needs_professional_review: toBooleanOrNull(domain.needs_professional_review)
            } as QuestionnaireSharedDomainDTO;
        })
        .filter((item): item is QuestionnaireSharedDomainDTO => Boolean(item));

    const comorbidity: QuestionnaireSharedComorbidityDTO[] = rawComorbidity
        .map((item) => {
            const key = firstNonEmptyString([item.coexistence_key]);
            if (!key) return null;
            return {
                coexistence_key: key,
                domains: asArray(item.domains).map(String),
                combined_risk_score: toNumberOrNull(item.combined_risk_score),
                coexistence_level: firstNonEmptyString([item.coexistence_level]),
                summary: firstNonEmptyString([item.summary])
            } as QuestionnaireSharedComorbidityDTO;
        })
        .filter((item): item is QuestionnaireSharedComorbidityDTO => Boolean(item));

    const questionnaireId =
        firstNonEmptyString([session?.questionnaire_id, root.questionnaire_id, root.questionnaireId]) ?? undefined;
    const shareCode = firstNonEmptyString([root.share_code, root.shareCode]) ?? undefined;
    const sharedPath =
        questionnaireId && shareCode
            ? `/cuestionario/compartido/${questionnaireId}/${shareCode}`
            : undefined;
    const sharedUrl =
        firstNonEmptyString([root.url, root.share_url, root.public_url, root.link]) ?? sharedPath ?? undefined;

    return {
        ...root,
        questionnaire_id: questionnaireId,
        share_code: shareCode,
        shared_path: sharedPath,
        shared_url: sharedUrl,
        session,
        result,
        domains,
        comorbidity
    };
}

function normalizeEvaluationResult(value: unknown) {
    const record = asRecord(value);
    if (!record) return null;
    const primaryDomainSource = asRecord(record.primary_domain) ?? asRecord(record.primaryDomain);
    return {
        ...record,
        summary: firstNonEmptyString([record.summary]),
        operational_recommendation: firstNonEmptyString([record.operational_recommendation]),
        primary_domain: primaryDomainSource ? normalizeEvaluationDomains([primaryDomainSource])[0] ?? null : null,
        observed_indicators: asArray(record.observed_indicators ?? record.observedIndicators ?? record.indicators)
            .map(normalizeObservedIndicator)
            .filter((item): item is QuestionnaireObservedIndicatorDTO => Boolean(item)),
        completion_quality_score: toNumberOrNull(record.completion_quality_score),
        missingness_score: toNumberOrNull(record.missingness_score),
        needs_professional_review: toBooleanOrNull(record.needs_professional_review),
        safety_flags: asArray(record.safety_flags).map(String),
        urgent_referral_recommended: toBooleanOrNull(record.urgent_referral_recommended),
        safety_signal_items: asArray(record.safety_signal_items).map(String),
        inconsistency_flags: asArray(record.inconsistency_flags).map(String),
        clinical_consistency_warnings: asArray(record.clinical_consistency_warnings).map(String),
        score_type: firstNonEmptyString([record.score_type]),
        score_label: firstNonEmptyString([record.score_label]),
        score_explanation: firstNonEmptyString([record.score_explanation]),
        developmental_context_notes: Array.isArray(record.developmental_context_notes)
            ? asArray(record.developmental_context_notes).map(String)
            : firstNonEmptyString([record.developmental_context_notes]),
        data_quality: asRecord(record.data_quality)
    };
}

function normalizeEvaluationDomains(value: unknown) {
    return asArray(value)
        .map(asRecord)
        .filter((item): item is Record<string, unknown> => Boolean(item))
        .map((domain) => ({
            ...domain,
            domain: firstNonEmptyString([domain.domain, domain.domain_code]),
            domain_code: firstNonEmptyString([domain.domain_code, domain.domain]),
            domain_label: firstNonEmptyString([domain.domain_label]),
            probability: toNumberOrNull(domain.probability),
            alert_level: firstNonEmptyString([domain.alert_level]),
            confidence_pct: toNumberOrNull(domain.confidence_pct),
            confidence_band: firstNonEmptyString([domain.confidence_band]),
            model_id: firstNonEmptyString([domain.model_id]),
            model_version: firstNonEmptyString([domain.model_version]),
            mode: firstNonEmptyString([domain.mode]),
            operational_class: firstNonEmptyString([domain.operational_class]),
            operational_caveat: firstNonEmptyString([domain.operational_caveat]),
            result_summary: firstNonEmptyString([domain.result_summary]),
            needs_professional_review: toBooleanOrNull(domain.needs_professional_review),
            score_type: firstNonEmptyString([domain.score_type]),
            score_label: firstNonEmptyString([domain.score_label]),
            score_explanation: firstNonEmptyString([domain.score_explanation])
        }));
}

function normalizeEvaluationComorbidity(value: unknown) {
    return asArray(value)
        .map(asRecord)
        .filter((item): item is Record<string, unknown> => Boolean(item))
        .map((item) => ({
            ...item,
            coexistence_key: firstNonEmptyString([item.coexistence_key]),
            domains: asArray(item.domains).map(String),
            combined_risk_score: toNumberOrNull(item.combined_risk_score),
            coexistence_level: firstNonEmptyString([item.coexistence_level]),
            summary: firstNonEmptyString([item.summary])
        }));
}

function extractFilenameFromHeaders(headers: Headers) {
    const disposition = headers.get('content-disposition') ?? '';
    if (!disposition) return null;

    const utf8FilenamePattern = /filename\*=UTF-8''([^;]+)/i;
    const basicFilenamePattern = /filename="?([^";]+)"?/i;
    const utf8Match = utf8FilenamePattern.exec(disposition);
    if (utf8Match?.[1]) {
        try {
            return decodeURIComponent(utf8Match[1]);
        } catch {
            return utf8Match[1];
        }
    }

    const basicMatch = basicFilenamePattern.exec(disposition);
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
    const request = sensitiveTransportEnabled
        ? apiSecurePost<unknown, CreateQuestionnaireSessionV2Payload>(
            '/api/v2/questionnaires/sessions',
            payload,
            requestOptions
        )
        : apiPost<unknown, CreateQuestionnaireSessionV2Payload>(
            '/api/v2/questionnaires/sessions',
            payload,
            requestOptions
        );

    return request.then(normalizeSession);
}

export function getQuestionnaireSessionV2(sessionId: string) {
    const request = sensitiveTransportEnabled
        ? apiSecurePost<unknown, Record<string, never>>(
            `/api/v2/questionnaires/sessions/${sessionId}/secure`,
            {},
            requestOptions
        )
        : apiGet<unknown>(`/api/v2/questionnaires/sessions/${sessionId}`, requestOptions);

    return request.then(normalizeSession);
}

export function getQuestionnaireSessionPageV2(sessionId: string, params?: { page?: number; page_size?: number }) {
    const page = params?.page ?? 1;
    const pageSize = params?.page_size ?? sessionDefaultPageSize;
    const request = sensitiveTransportEnabled
        ? apiSecurePost<unknown, { page: number; page_size: number }>(
            `/api/v2/questionnaires/sessions/${sessionId}/page-secure`,
            { page, page_size: pageSize },
            requestOptions
        )
        : apiGet<unknown>(
            `/api/v2/questionnaires/sessions/${sessionId}/page?${buildSearch({ page, page_size: pageSize })}`,
            requestOptions
        );

    return request.then((payload) =>
        normalizeSessionPageResponse(payload, page, pageSize)
    );
}

export async function getAllQuestionnaireSessionQuestionsV2(sessionId: string, pageSize = sessionDefaultPageSize) {
    const questions: QuestionnaireQuestionV2DTO[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
        const response = await getQuestionnaireSessionPageV2(sessionId, { page, page_size: pageSize });
        questions.push(...(response.items ?? []));
        totalPages = response.pagination.pages ?? 1;
        if ((response.items ?? []).length === 0) break;
        page += 1;
    }

    return questions;
}

export function patchQuestionnaireSessionAnswersV2(sessionId: string, payload: PatchSessionAnswersV2Payload) {
    if (sensitiveTransportEnabled) {
        return apiSecurePatch<unknown, PatchSessionAnswersV2Payload>(
            `/api/v2/questionnaires/sessions/${sessionId}/answers`,
            payload,
            requestOptions
        );
    }

    return apiPatch<unknown, PatchSessionAnswersV2Payload>(
        `/api/v2/questionnaires/sessions/${sessionId}/answers`,
        payload,
        requestOptions
    );
}

export function submitQuestionnaireSessionV2(sessionId: string, payload?: Record<string, unknown>) {
    const request = sensitiveTransportEnabled
        ? (payload
            ? apiSecurePost<unknown, Record<string, unknown>>(
                `/api/v2/questionnaires/sessions/${sessionId}/submit`,
                payload,
                requestOptions
            )
            : apiSecurePostNoBody<unknown>(
                `/api/v2/questionnaires/sessions/${sessionId}/submit`,
                requestOptions
            ))
        : (payload
            ? apiPost<unknown, Record<string, unknown>>(
                `/api/v2/questionnaires/sessions/${sessionId}/submit`,
                payload,
                requestOptions
            )
            : apiPostNoBody<unknown>(
                `/api/v2/questionnaires/sessions/${sessionId}/submit`,
                requestOptions
            ));

    return request.then(normalizeSubmitResponse);
}

export function getQuestionnaireHistoryV2(params?: QuestionnaireHistoryFiltersV2) {
    const page = params?.page ?? 1;
    const pageSize = params?.page_size ?? defaultPageSize;
    const query = buildSearch({
        status: params?.status,
        case_id: params?.case_id,
        case_public_id: params?.case_public_id,
        case_label: params?.case_label,
        tag: params?.tag,
        q: params?.q,
        date_from: params?.date_from,
        date_to: params?.date_to,
        domain: params?.domain,
        alert_level: params?.alert_level,
        needs_professional_review: params?.needs_professional_review,
        page,
        page_size: pageSize
    });
    const request = sensitiveTransportEnabled
        ? apiSecurePost<unknown, QuestionnaireHistoryFiltersV2>(
            '/api/v2/questionnaires/history/secure',
            {
                status: params?.status,
                case_id: params?.case_id,
                case_public_id: params?.case_public_id,
                case_label: params?.case_label,
                tag: params?.tag,
                q: params?.q,
                date_from: params?.date_from,
                date_to: params?.date_to,
                domain: params?.domain,
                alert_level: params?.alert_level,
                needs_professional_review: params?.needs_professional_review,
                page,
                page_size: pageSize
            },
            dashboardRequestOptions
        )
        : apiGet<unknown>(`/api/v2/questionnaires/history?${query}`, dashboardRequestOptions);

    return request
        .then((payload) => {
            const response = normalizeHistoryResponse(payload, page, pageSize);
            if (isDevDashboardDemoEnabled() && response.items.length === 0) {
                return getDemoQuestionnaireHistoryResponse(page, pageSize);
            }
            return response;
        })
        .catch((error) => {
            if (isDevDashboardDemoEnabled()) return getDemoQuestionnaireHistoryResponse(page, pageSize);
            throw error;
        });
}

export function getQuestionnaireCasesV2(params?: QuestionnaireCasesFiltersV2) {
    const page = params?.page ?? 1;
    const pageSize = params?.page_size ?? defaultPageSize;
    const query = buildSearch({
        status: params?.status,
        q: params?.q,
        label: params?.label,
        case_public_id: params?.case_public_id,
        has_sessions: params?.has_sessions,
        latest_alert_level: params?.latest_alert_level,
        date_from: params?.date_from,
        date_to: params?.date_to,
        page,
        page_size: pageSize
    });
    return apiGet<unknown>(`/api/v2/questionnaires/cases?${query}`, requestOptions)
        .then((payload) => {
            const response = normalizeCasesResponse(payload, page, pageSize);
            if (isDevDashboardDemoEnabled() && response.items.length === 0) {
                return getDemoQuestionnaireCasesResponse(page, pageSize);
            }
            return response;
        })
        .catch((error) => {
            if (isDevDashboardDemoEnabled()) return getDemoQuestionnaireCasesResponse(page, pageSize);
            throw error;
        });
}

export function createQuestionnaireCaseV2(payload: Record<string, unknown>) {
    return apiPost<unknown, Record<string, unknown>>('/api/v2/questionnaires/cases', payload, requestOptions).then(
        (response) => normalizeCase(pickRecord(response, ['case', 'item', 'data']) ?? response)
    );
}

export function updateQuestionnaireCaseV2(caseId: string, payload: Record<string, unknown>) {
    return apiPatch<unknown, Record<string, unknown>>(`/api/v2/questionnaires/cases/${caseId}`, payload, requestOptions).then(
        (response) => normalizeCase(pickRecord(response, ['case', 'item', 'data']) ?? response)
    );
}

export function getQuestionnaireCaseDetailV2(caseId: string) {
    return apiGet<unknown>(`/api/v2/questionnaires/cases/${caseId}`, requestOptions)
        .then(normalizeCaseDetailResponse)
        .catch((error) => {
            if (isDevDashboardDemoEnabled()) return getDemoQuestionnaireCaseDetail(caseId);
            throw error;
        });
}

export function getGuardianDashboardV2(params?: QuestionnaireGuardianDashboardFiltersV2) {
    const query = buildSearch({
        months: params?.months,
        date_from: params?.date_from,
        date_to: params?.date_to,
        case_id: params?.case_id,
        case_public_id: params?.case_public_id,
        case_label: params?.case_label,
        q: params?.q,
        domain: params?.domain,
        alert_level: params?.alert_level
    });
    const path = query.length > 0
        ? `/api/v2/questionnaires/guardian/dashboard?${query}`
        : '/api/v2/questionnaires/guardian/dashboard';
    return apiGet<unknown>(path, dashboardRequestOptions)
        .then((payload) => {
            const response = normalizeGuardianDashboardResponse(payload);
            if (isDevDashboardDemoEnabled() && !response.cases?.length) {
                return getDemoGuardianDashboardV2();
            }
            return response;
        })
        .catch((error) => {
            if (isDevDashboardDemoEnabled()) return getDemoGuardianDashboardV2();
            throw error;
        });
}

export function getGuardianQuestionnaireDashboardV2(
    params?: QuestionnaireGuardianDashboardFiltersV2
): Promise<GuardianDashboardDTO> {
    return getGuardianDashboardV2(params).then((response) => ({
        ...(response as Record<string, unknown>),
        cases: asArray(response?.cases) as GuardianDashboardDTO['cases']
    })) as Promise<GuardianDashboardDTO>;
}

export function getPsychologistDashboardV2(params?: QuestionnairePsychologistDashboardFiltersV2) {
    const page = params?.page ?? 1;
    const pageSize = params?.page_size ?? defaultPageSize;
    const query = buildSearch({
        q: params?.q,
        case_public_id: params?.case_public_id,
        date_from: params?.date_from,
        date_to: params?.date_to,
        domain: params?.domain,
        alert_level: params?.alert_level,
        review_status: params?.review_status,
        page,
        page_size: pageSize
    });
    return apiGet<unknown>(`/api/v2/questionnaires/psychologist/dashboard?${query}`, dashboardRequestOptions)
        .then((payload) => {
            const response = normalizePsychologistDashboardResponse(payload);
            if (isDevDashboardDemoEnabled() && !response.items?.length) {
                return getDemoPsychologistDashboardV2(page, pageSize);
            }
            return response;
        })
        .catch((error) => {
            if (isDevDashboardDemoEnabled()) return getDemoPsychologistDashboardV2(page, pageSize);
            throw error;
        });
}

export function getPsychologistQuestionnaireDashboardV2(
    params?: QuestionnairePsychologistDashboardFiltersV2
): Promise<PsychologistDashboardDTO> {
    return getPsychologistDashboardV2(params).then((response) => {
        const items = asArray(response?.items);
        const firstItem = items[0] as Record<string, unknown> | undefined;
        if (isDevDashboardDemoEnabled() && (!items.length || !Array.isArray(firstItem?.domains))) {
            return getDemoPsychologistDashboard(params?.page ?? 1, params?.page_size ?? defaultPageSize);
        }
        return {
            ...(response as Record<string, unknown>),
            items: items as PsychologistDashboardDTO['items'],
            pagination: normalizePagination(response?.pagination, params?.page ?? 1, params?.page_size ?? defaultPageSize)
        };
    }) as Promise<PsychologistDashboardDTO>;
}

export function getPsychologistShareRequestsV2(params?: {
    page?: number;
    page_size?: number;
    status?: string;
    q?: string;
    date_from?: string;
    date_to?: string;
}) {
    const page = params?.page ?? 1;
    const pageSize = params?.page_size ?? defaultPageSize;
    const query = buildSearch({
        page,
        page_size: pageSize,
        status: params?.status,
        q: params?.q,
        date_from: params?.date_from,
        date_to: params?.date_to
    });
    return apiGet<unknown>(`/api/v2/questionnaires/psychologist/share-requests?${query}`, requestOptions)
        .then((payload) => {
            const response = normalizeShareRequestsResponse(payload, page, pageSize);
            if (isDevDashboardDemoEnabled() && !response.items?.length) {
                return getDemoShareRequests(page, pageSize) as unknown as QuestionnairePsychologistShareRequestsV2Response;
            }
            return response;
        })
        .catch((error) => {
            if (isDevDashboardDemoEnabled()) return getDemoShareRequests(page, pageSize) as unknown as QuestionnairePsychologistShareRequestsV2Response;
            throw error;
        });
}

export function acceptPsychologistShareRequestV2(grantId: string, payload?: { message?: string }) {
    if (payload && payload.message) {
        return apiPost<unknown, { message?: string }>(
            `/api/v2/questionnaires/psychologist/share-requests/${grantId}/accept`,
            payload,
            requestOptions
        );
    }

    return apiPostNoBody<unknown>(`/api/v2/questionnaires/psychologist/share-requests/${grantId}/accept`, requestOptions);
}

export function rejectPsychologistShareRequestV2(grantId: string, payload?: { message?: string }) {
    if (payload && payload.message) {
        return apiPost<unknown, { message?: string }>(
            `/api/v2/questionnaires/psychologist/share-requests/${grantId}/reject`,
            payload,
            requestOptions
        );
    }

    return apiPostNoBody<unknown>(`/api/v2/questionnaires/psychologist/share-requests/${grantId}/reject`, requestOptions);
}

export function getQuestionnaireNotificationsV2() {
    return apiGet<unknown>('/api/v2/notifications', requestOptions).then(normalizeNotificationsResponse);
}

export function markQuestionnaireNotificationAsReadV2(notificationId: string) {
    return apiPatch<unknown, Record<string, never>>(`/api/v2/notifications/${notificationId}/read`, {}, requestOptions);
}

export function getQuestionnaireHistoryDetailV2(sessionId: string) {
    return apiGet<unknown>(`/api/v2/questionnaires/history/${sessionId}`, requestOptions)
        .then(normalizeHistoryDetail)
        .catch((error) => {
            if (isDevDashboardDemoEnabled()) return getDemoQuestionnaireHistoryDetail(sessionId);
            throw error;
        });
}

export function getQuestionnaireReportPreviewV2(sessionId: string): Promise<QuestionnaireReportPreviewDTO> {
    return apiGet<unknown>(`/api/v2/questionnaires/history/${sessionId}/report-preview`, requestOptions).then((payload) =>
        normalizeReportPreview(pickRecord(payload, ['preview', 'data', 'result']) ?? payload)
    );
}

export function getQuestionnaireHistoryResultsV2(sessionId: string) {
    if (!sensitiveTransportEnabled) {
        return apiGet<unknown>(`/api/v2/questionnaires/history/${sessionId}/results`, requestOptions).then(normalizeSecureResults);
    }

    return apiSecurePostNoBody<unknown>(
        `/api/v2/questionnaires/history/${sessionId}/results-secure`,
        requestOptions
    ).then(normalizeSecureResults);
}

export function getQuestionnaireHistoryResponsesV2(sessionId: string): Promise<QuestionnaireHistoryResponsesV2Response> {
    return apiGet<unknown>(
        `/api/v2/questionnaires/history/${sessionId}/responses`,
        requestOptions
    ).then(normalizeHistoryResponsesResponse);
}

export function getQuestionnaireClinicalSummaryV2(sessionId: string) {
    return apiSecurePostNoBody<unknown>(
        `/api/v2/questionnaires/history/${sessionId}/clinical-summary`,
        requestOptions
    ).then(normalizeClinicalSummary);
}

export function getQuestionnaireProfessionalReviewsV2(sessionId: string): Promise<QuestionnaireProfessionalReviewDTO[]> {
    return apiGet<unknown>(
        `/api/v2/questionnaires/history/${sessionId}/professional-reviews`,
        requestOptions
    ).then((payload) =>
        asArray(pickRecord(payload, ['items', 'reviews', 'data']) ?? payload)
            .map(normalizeProfessionalReview)
            .filter((item): item is QuestionnaireProfessionalReviewDTO => Boolean(item))
    );
}

export function createQuestionnaireProfessionalReviewV2(
    sessionId: string,
    payload: Record<string, unknown>
): Promise<QuestionnaireProfessionalReviewDTO> {
    return apiPost<unknown, Record<string, unknown>>(
        `/api/v2/questionnaires/history/${sessionId}/professional-reviews`,
        payload,
        requestOptions
    ).then((response) => normalizeProfessionalReview(response) ?? ({ review_id: '' } as QuestionnaireProfessionalReviewDTO));
}

export function updateQuestionnaireProfessionalReviewV2(
    sessionId: string,
    reviewId: string,
    payload: Record<string, unknown>
): Promise<QuestionnaireProfessionalReviewDTO> {
    return apiPatch<unknown, Record<string, unknown>>(
        `/api/v2/questionnaires/history/${sessionId}/professional-reviews/${reviewId}`,
        payload,
        requestOptions
    ).then((response) => normalizeProfessionalReview(response) ?? ({ review_id: reviewId } as QuestionnaireProfessionalReviewDTO));
}

export function addQuestionnaireHistoryTagV2(sessionId: string, payload: AddQuestionnaireTagPayload) {
    return apiPost<Record<string, unknown>, AddQuestionnaireTagPayload>(
        `/api/v2/questionnaires/history/${sessionId}/tags`,
        payload,
        requestOptions
    ).catch((error) => {
        if (isDevDashboardDemoEnabled()) {
            return {
                tag: {
                    id: `demo-tag-${Date.now()}`,
                    label: payload.tag,
                    color: payload.color,
                    visibility: payload.visibility
                }
            };
        }
        throw error;
    });
}

export function deleteQuestionnaireHistoryTagV2(sessionId: string, tagId: string) {
    return apiDelete<Record<string, unknown>>(
        `/api/v2/questionnaires/history/${sessionId}/tags/${tagId}`,
        requestOptions
    ).catch((error) => {
        if (isDevDashboardDemoEnabled()) return {};
        throw error;
    });
}

export function shareQuestionnaireHistoryV2(sessionId: string, payload?: ShareQuestionnairePayload) {
    if (payload) {
        return apiPost<unknown, ShareQuestionnairePayload>(
            `/api/v2/questionnaires/history/${sessionId}/share`,
            payload,
            requestOptions
        )
            .then(normalizeShareResponse)
            .catch((error) => {
                if (isDevDashboardDemoEnabled()) return getDemoQuestionnaireShareResponse(sessionId);
                throw error;
            });
    }

    return apiPostNoBody<unknown>(
        `/api/v2/questionnaires/history/${sessionId}/share`,
        requestOptions
    )
        .then(normalizeShareResponse)
        .catch((error) => {
            if (isDevDashboardDemoEnabled()) return getDemoQuestionnaireShareResponse(sessionId);
            throw error;
        });
}

export function searchPsychologistsV2(params?: {
    q?: string;
    department?: string;
    city?: string;
    same_location?: boolean;
    recommended?: boolean;
    page?: number;
    page_size?: number;
}): Promise<PsychologistSearchResponseDTO> {
    const page = params?.page ?? 1;
    const pageSize = params?.page_size ?? 10;
    const query = buildSearch({
        q: params?.q,
        department: params?.department,
        city: params?.city,
        same_location: params?.same_location,
        recommended: params?.recommended,
        page,
        page_size: pageSize
    });
    return apiGet<unknown>(`/api/v2/psychologists/search?${query}`, requestOptions).then((payload) => {
        const root = asRecord(pickRecord(payload, ['data', 'result']) ?? payload) ?? {};
        const items = asArray(root.items ?? root.results ?? root.psychologists)
            .map(normalizePsychologistSearchItem)
            .filter((item): item is PsychologistSearchItemDTO => Boolean(item));
        return {
            ...root,
            items,
            warnings: asArray<string>(root.warnings),
            pagination: normalizePagination(root.pagination ?? root, page, pageSize)
        } as PsychologistSearchResponseDTO;
    });
}

export function shareQuestionnaireWithPsychologistV2(
    sessionId: string,
    payload: Record<string, unknown>
): Promise<QuestionnaireShareResponseDTO> {
    const requestPayload: ShareQuestionnairePayload = {
        grantee_user_id: typeof payload.grantee_user_id === 'string' ? payload.grantee_user_id : undefined,
        grant_can_download_pdf: payload.grant_can_download_pdf === false ? false : true,
        grant_can_tag: payload.grant_can_tag === true,
        share_scope: payload.share_scope === 'case' ? 'case' : 'session'
    };
    return shareQuestionnaireHistoryV2(sessionId, requestPayload);
}

export function generateQuestionnaireHistoryPdfV2(sessionId: string) {
    return apiPostNoBody<Record<string, unknown>>(
        `/api/v2/questionnaires/history/${sessionId}/pdf/generate`,
        requestOptions
    ).catch((error) => {
        if (isDevDashboardDemoEnabled()) return getDemoQuestionnairePdfInfo(sessionId);
        throw error;
    });
}

export function getQuestionnaireHistoryPdfV2(sessionId: string) {
    const request = sensitiveTransportEnabled
        ? apiSecurePostNoBody<unknown>(
            `/api/v2/questionnaires/history/${sessionId}/pdf/secure`,
            requestOptions
        )
        : apiGet<unknown>(`/api/v2/questionnaires/history/${sessionId}/pdf`, requestOptions);

    return request
        .then(normalizePdfInfo)
        .catch((error) => {
            if (isDevDashboardDemoEnabled()) return getDemoQuestionnairePdfInfo(sessionId);
            throw error;
        });
}

export async function downloadQuestionnaireHistoryPdfV2(sessionId: string): Promise<DownloadPdfResult> {
    try {
        const result = await apiGetBlobWithMeta(
            `/api/v2/questionnaires/history/${sessionId}/pdf/download`,
            requestOptions
        );
        const filename = extractFilenameFromHeaders(result.headers) ?? `cuestionario-${sessionId}.pdf`;
        return {
            blob: result.blob,
            filename
        };
    } catch (error) {
        if (isDevDashboardDemoEnabled()) {
            return {
                blob: new Blob(['Reporte demo CognIA'], { type: 'application/pdf' }),
                filename: `reporte-${sessionId}.pdf`
            };
        }
        throw error;
    }
}

export function getSharedQuestionnaireV2(questionnaireId: string, shareCode: string) {
    const request = sensitiveTransportEnabled
        ? apiSecurePost<unknown, { questionnaire_id: string; share_code: string }>(
            '/api/v2/questionnaires/shared/access-secure',
            {
                questionnaire_id: questionnaireId,
                share_code: shareCode
            },
            publicRequestOptions
        )
        : apiGet<unknown>(`/api/v2/questionnaires/shared/${questionnaireId}/${shareCode}`, publicRequestOptions);

    return request.then(normalizeSharedQuestionnaire);
}
