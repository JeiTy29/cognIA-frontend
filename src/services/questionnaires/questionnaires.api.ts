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
    CreateQuestionnaireCasePayload,
    CreateQuestionnaireSessionV2Payload,
    DownloadPdfResult,
    GuardianDashboardDTO,
    PatchSessionAnswersV2Payload,
    ProfessionalReviewPayload,
    PsychologistDashboardDTO,
    PsychologistSearchResponseDTO,
    QuestionnaireCaseDTO,
    QuestionnaireCaseDetailDTO,
    QuestionnaireCaseListResponseDTO,
    QuestionnaireHistoryDetailV2DTO,
    QuestionnaireHistoryListV2Response,
    QuestionnaireHistoryStatusFilter,
    QuestionnaireClinicalComorbidityV2DTO,
    QuestionnaireClinicalDomainV2DTO,
    QuestionnaireClinicalNarrativeV2DTO,
    QuestionnaireClinicalSectionV2DTO,
    QuestionnaireClinicalSummaryV2DTO,
    QuestionnairePdfInfoV2DTO,
    QuestionnaireSecureResultsV2DTO,
    QuestionnaireSubmitResponseV2DTO,
    QuestionnaireQuestionV2DTO,
    QuestionnaireReportPreviewDTO,
    QuestionnaireProfessionalReviewDTO,
    QuestionnaireSessionPageV2Response,
    QuestionnaireSessionV2DTO,
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
    ShareQuestionnairePayload,
    ShareWithPsychologistPayload,
    UpdateQuestionnaireCasePayload
} from './questionnaires.types';

const requestOptions = {
    auth: true,
    credentials: 'include' as const
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

function pickFiniteNumber(candidates: unknown[]) {
    for (const candidate of candidates) {
        const parsed = toNumberOrNull(candidate);
        if (parsed !== null) return parsed;
    }
    return null;
}

function toBooleanOrNull(value: unknown) {
    if (typeof value === 'boolean') return value;
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
    const responseMin = pickFiniteNumber([record.response_min, record.min_value, record.min, record.minimum]);
    const responseMax = pickFiniteNumber([record.response_max, record.max_value, record.max, record.maximum]);
    const responseStep = pickFiniteNumber([record.response_step, record.step, record.increment]);

    return {
        ...record,
        id,
        text,
        response_type: responseType,
        response_options: responseOptions,
        response_min: responseMin,
        response_max: responseMax,
        response_step: responseStep,
        help_text: firstNonEmptyString([
            record.help_text,
            record.context,
            record.description,
            record.guidance,
            record.hint,
            record.instructions,
            record.explanation
        ]),
        context: firstNonEmptyString([record.context, record.help_text]),
        description: firstNonEmptyString([record.description]),
        guidance: firstNonEmptyString([record.guidance]),
        hint: firstNonEmptyString([record.hint]),
        instructions: firstNonEmptyString([record.instructions]),
        explanation: firstNonEmptyString([record.explanation]),
        section_title: firstNonEmptyString([record.section_title, record.section])
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
        case: normalizeCase(record.case),
        case_id: firstNonEmptyString([record.case_id, asRecord(record.case)?.case_id]),
        case_public_id: firstNonEmptyString([record.case_public_id, record.case_code, asRecord(record.case)?.case_public_id]),
        case_label: firstNonEmptyString([record.case_label]),
        case_private_label: firstNonEmptyString([record.case_private_label, asRecord(record.case)?.private_label]),
        case_display_label: firstNonEmptyString([record.case_display_label, asRecord(record.case)?.display_label]),
        progress_pct: toNumberOrNull(record.progress_pct),
        progress_percent: toNumberOrNull(record.progress_percent),
        total_questions: toNumberOrNull(record.total_questions),
        answered_count: toNumberOrNull(record.answered_count),
        version: firstNonEmptyString([record.version]),
        result,
        domains: normalizeEvaluationDomains(record.domains ?? resultPayload?.domains),
        comorbidity: normalizeEvaluationComorbidity(record.comorbidity ?? resultPayload?.comorbidity),
        metadata: asRecord(record.metadata)
    } as QuestionnaireSessionV2DTO;
}

function normalizeCase(value: unknown): QuestionnaireCaseDTO | null {
    const record = asRecord(value);
    if (!record) return null;
    const caseId = firstNonEmptyString([record.case_id, record.id]);
    if (!caseId) return null;

    return {
        ...record,
        case_id: caseId,
        case_public_id: firstNonEmptyString([record.case_public_id, record.public_id]),
        private_label: firstNonEmptyString([record.private_label, record.label, record.name]),
        display_label: firstNonEmptyString([record.display_label, record.private_label, record.label, record.name]),
        status: firstNonEmptyString([record.status]),
        sessions_count: pickFiniteNumber([record.sessions_count, record.total_sessions]),
        latest_session_id: firstNonEmptyString([record.latest_session_id]),
        latest_processed_at: firstNonEmptyString([record.latest_processed_at, record.processed_at]),
        latest_alert_level: firstNonEmptyString([record.latest_alert_level]),
        created_at: firstNonEmptyString([record.created_at]),
        updated_at: firstNonEmptyString([record.updated_at])
    };
}

function normalizeCaseDomainSummary(value: unknown) {
    const record = asRecord(value);
    if (!record) return null;
    return {
        ...record,
        domain: firstNonEmptyString([record.domain]),
        latest_probability: pickFiniteNumber([record.latest_probability, record.probability]),
        latest_alert_level: firstNonEmptyString([record.latest_alert_level, record.alert_level]),
        max_probability: pickFiniteNumber([record.max_probability]),
        sessions_with_alert: pickFiniteNumber([record.sessions_with_alert, record.count])
    };
}

function normalizeCaseTrendPoint(value: unknown) {
    const record = asRecord(value);
    if (!record) return null;
    return {
        ...record,
        date: firstNonEmptyString([record.date, record.bucket, record.period]),
        session_id: firstNonEmptyString([record.session_id]),
        domains: asArray(record.domains)
            .map((item) => normalizeCaseDomainSummary(item))
            .filter((item): item is NonNullable<ReturnType<typeof normalizeCaseDomainSummary>> => Boolean(item))
            .map((item) => ({
                domain: item.domain,
                probability: item.latest_probability,
                alert_level: item.latest_alert_level
            }))
    };
}

function normalizeCaseListResponse(payload: unknown, page = 1, pageSize = defaultPageSize): QuestionnaireCaseListResponseDTO {
    const root = pickRecord(payload, ['data', 'result', 'response']) ?? asRecord(payload);
    const items = asArray(root?.items ?? root?.cases)
        .map(normalizeCase)
        .filter((item): item is QuestionnaireCaseDTO => Boolean(item));

    return {
        items,
        pagination: normalizePagination(root?.pagination, page, pageSize)
    };
}

function normalizeCaseDetailResponse(payload: unknown): QuestionnaireCaseDetailDTO {
    const root = asRecord(payload) ?? {};
    const caseRecord = normalizeCase(root.case ?? root.item ?? root.data);
    const sessions = asArray(root.sessions).map(normalizeSession).filter((item) => Boolean(item.id));
    const domain_summary = asArray(root.domain_summary)
        .map(normalizeCaseDomainSummary)
        .filter((item): item is NonNullable<ReturnType<typeof normalizeCaseDomainSummary>> => Boolean(item));
    const trend = asArray(root.trend)
        .map(normalizeCaseTrendPoint)
        .filter((item): item is NonNullable<ReturnType<typeof normalizeCaseTrendPoint>> => Boolean(item));

    return {
        ...root,
        case: caseRecord,
        sessions,
        domain_summary,
        trend
    };
}

function normalizeGuardianDashboard(payload: unknown): GuardianDashboardDTO {
    const root = asRecord(payload) ?? {};
    const cases = asArray(root.cases).reduce<GuardianDashboardDTO['cases']>((items, value) => {
        const record = asRecord(value);
        if (!record) return items;
        items.push({
            ...record,
            case: normalizeCase(record.case),
            sessions_count: pickFiniteNumber([record.sessions_count]),
            latest_session: record.latest_session ? normalizeSession(record.latest_session) : null,
            domain_breakdown: asArray(record.domain_breakdown)
                .map(normalizeCaseDomainSummary)
                .filter((item): item is NonNullable<ReturnType<typeof normalizeCaseDomainSummary>> => Boolean(item)),
            trend: asArray(record.trend)
                .map(normalizeCaseTrendPoint)
                .filter((item): item is NonNullable<ReturnType<typeof normalizeCaseTrendPoint>> => Boolean(item)),
            chart_data: asRecord(record.chart_data)
        });
        return items;
    }, []);

    return {
        ...root,
        period: asRecord(root.period),
        summary: asRecord(root.summary),
        cases,
        warnings: asArray<string>(root.warnings)
    };
}

function normalizePsychologistSearchResponse(payload: unknown, page = 1, pageSize = defaultPageSize): PsychologistSearchResponseDTO {
    const root = pickRecord(payload, ['data', 'result', 'response']) ?? asRecord(payload);
    const items = asArray(root?.items).reduce<PsychologistSearchResponseDTO['items']>((itemsList, value) => {
        const record = asRecord(value);
        if (!record) return itemsList;
        const userId = firstNonEmptyString([record.user_id, record.id]);
        if (!userId) return itemsList;
        itemsList.push({
            ...record,
            user_id: userId,
            username: firstNonEmptyString([record.username]),
            full_name: firstNonEmptyString([record.full_name, record.display_name]),
            email: firstNonEmptyString([record.email]),
            professional_location: firstNonEmptyString([record.professional_location, record.location]),
            colpsic_verified: toBooleanOrNull(record.colpsic_verified)
        });
        return itemsList;
    }, []);

    return {
        items,
        pagination: normalizePagination(root?.pagination, page, pageSize)
    };
}

function normalizeProfessionalReview(value: unknown): QuestionnaireProfessionalReviewDTO | null {
    const record = asRecord(value);
    if (!record) return null;
    const reviewId = firstNonEmptyString([record.review_id, record.id]);
    if (!reviewId) return null;
    return {
        ...record,
        review_id: reviewId,
        session_id: firstNonEmptyString([record.session_id]),
        case_id: firstNonEmptyString([record.case_id]),
        owner_user_id: firstNonEmptyString([record.owner_user_id]),
        psychologist_user_id: firstNonEmptyString([record.psychologist_user_id]),
        review_status: firstNonEmptyString([record.review_status, record.status]),
        initial_concept: firstNonEmptyString([record.initial_concept, record.concept]),
        recommendation: firstNonEmptyString([record.recommendation]),
        visible_to_guardian: toBooleanOrNull(record.visible_to_guardian),
        is_diagnostic: toBooleanOrNull(record.is_diagnostic),
        created_at: firstNonEmptyString([record.created_at]),
        updated_at: firstNonEmptyString([record.updated_at])
    };
}

function normalizeShareWithPsychologistResponse(payload: unknown): QuestionnaireShareResponseDTO {
    const root = asRecord(payload) ?? {};
    const share = normalizeShareResponse(payload);
    return {
        ...share,
        share_code_id: firstNonEmptyString([root.share_code_id]) ?? undefined,
        case: asRecord(root.case) ?? undefined,
        grantee: asRecord(root.grantee) ?? undefined,
        grant: asRecord(root.grant) ?? undefined
    };
}

function normalizePsychologistDashboard(payload: unknown, page = 1, pageSize = defaultPageSize): PsychologistDashboardDTO {
    const root = asRecord(payload) ?? {};
    const items = asArray(root.items).reduce<PsychologistDashboardDTO['items']>((normalizedItems, value) => {
        const record = asRecord(value);
        if (!record) return normalizedItems;
        const sessionId = firstNonEmptyString([record.session_id, record.id]);
        if (!sessionId) return normalizedItems;
        normalizedItems.push({
            ...record,
            session_id: sessionId,
            case_public_id: firstNonEmptyString([record.case_public_id]),
            status: firstNonEmptyString([record.status]),
            processed_at: firstNonEmptyString([record.processed_at]),
            guardian: asRecord(record.guardian),
            domains: normalizeEvaluationDomains(record.domains),
            needs_professional_review: toBooleanOrNull(record.needs_professional_review),
            review_status: firstNonEmptyString([record.review_status]),
            latest_review: normalizeProfessionalReview(record.latest_review),
            can_review: toBooleanOrNull(record.can_review),
            can_download_pdf: toBooleanOrNull(record.can_download_pdf)
        });
        return normalizedItems;
    }, []);

    return {
        ...root,
        filters: asRecord(root.filters),
        summary: asRecord(root.summary),
        aggregates: {
            by_domain: asArray(root.aggregates && asRecord(root.aggregates)?.by_domain).map((item) => asRecord(item)).filter((item): item is Record<string, unknown> => Boolean(item)),
            by_alert_level: asArray(root.aggregates && asRecord(root.aggregates)?.by_alert_level).map((item) => asRecord(item)).filter((item): item is Record<string, unknown> => Boolean(item)),
            by_review_status: asArray(root.aggregates && asRecord(root.aggregates)?.by_review_status).map((item) => asRecord(item)).filter((item): item is Record<string, unknown> => Boolean(item))
        },
        items,
        pagination: normalizePagination(root.pagination, page, pageSize)
    };
}

function normalizeReportPreview(payload: unknown): QuestionnaireReportPreviewDTO {
    const root = asRecord(payload) ?? {};
    return {
        ...root,
        session: root.session ? normalizeSession(root.session) : null,
        result: normalizeEvaluationResult(root.result),
        domains: normalizeEvaluationDomains(root.domains),
        comorbidity: normalizeEvaluationComorbidity(root.comorbidity),
        answers: asArray(root.answers)
            .map((value) => asRecord(value))
            .filter((item): item is Record<string, unknown> => Boolean(item))
            .map((record) => ({
                ...record,
                question_id: firstNonEmptyString([record.question_id, record.id]),
                question_code: firstNonEmptyString([record.question_code, record.code]),
                prompt: firstNonEmptyString([record.prompt, record.question_text, record.question]),
                raw_answer: (record.raw_answer ?? null) as QuestionnaireReportPreviewDTO['answers'][number]['raw_answer'],
                raw_answer_display: firstNonEmptyString([record.raw_answer_display]),
                normalized_answer: firstNonEmptyString([record.normalized_answer, record.answer_value]),
                domain: firstNonEmptyString([record.domain]),
                section_title: firstNonEmptyString([record.section_title, record.section])
            })),
        professional_reviews: asArray(root.professional_reviews)
            .map(normalizeProfessionalReview)
            .filter((item): item is QuestionnaireProfessionalReviewDTO => Boolean(item)),
        pdf: asRecord(root.pdf) ? {
            ...asRecord(root.pdf),
            available: toBooleanOrNull(asRecord(root.pdf)?.available),
            file_name: firstNonEmptyString([asRecord(root.pdf)?.file_name, asRecord(root.pdf)?.filename]),
            download_url: firstNonEmptyString([asRecord(root.pdf)?.download_url])
        } : null,
        disclaimer: firstNonEmptyString([root.disclaimer])
    };
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
        session_id: resolveHistorySessionId(record, id),
        questionnaire_session_id: resolveHistoryQuestionnaireSessionId(record, id),
        questionnaire_id: questionnaireId,
        case: normalizeCase(record.case),
        case_id: firstNonEmptyString([record.case_id, asRecord(record.case)?.case_id]),
        case_public_id: firstNonEmptyString([record.case_public_id, record.case_code, asRecord(record.case)?.case_public_id]),
        case_label: firstNonEmptyString([record.case_label]),
        case_private_label: firstNonEmptyString([record.case_private_label, asRecord(record.case)?.private_label]),
        case_display_label: firstNonEmptyString([record.case_display_label, asRecord(record.case)?.display_label])
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
        session_id: resolveHistorySessionId(root, id),
        questionnaire_session_id: resolveHistoryQuestionnaireSessionId(root, id),
        case: normalizeCase(root.case),
        case_id: firstNonEmptyString([root.case_id, asRecord(root.case)?.case_id]),
        case_public_id: firstNonEmptyString([root.case_public_id, root.case_code, asRecord(root.case)?.case_public_id]),
        case_label: firstNonEmptyString([root.case_label]),
        case_private_label: firstNonEmptyString([root.case_private_label, asRecord(root.case)?.private_label]),
        case_display_label: firstNonEmptyString([root.case_display_label, asRecord(root.case)?.display_label]),
        tags
    } as QuestionnaireHistoryDetailV2DTO;
}

function normalizeSecureResults(payload: unknown): QuestionnaireSecureResultsV2DTO {
    const root = pickRecord(payload, ['results', 'result', 'data']);
    if (!root) {
        return {
            session: { id: '' },
            result: null,
            domains: [],
            comorbidity: []
        };
    }

    const sessionSource = asRecord(root.session) ?? root;
    return {
        ...root,
        session: normalizeSession(sessionSource),
        result: normalizeEvaluationResult(asRecord(root.result) ?? asRecord(root.results) ?? null),
        domains: normalizeEvaluationDomains(root.domains),
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
    return {
        ...record,
        summary: firstNonEmptyString([record.summary]),
        operational_recommendation: firstNonEmptyString([record.operational_recommendation]),
        completion_quality_score: toNumberOrNull(record.completion_quality_score),
        missingness_score: toNumberOrNull(record.missingness_score),
        needs_professional_review: toBooleanOrNull(record.needs_professional_review)
    };
}

function normalizeEvaluationDomains(value: unknown) {
    return asArray(value)
        .map(asRecord)
        .filter((item): item is Record<string, unknown> => Boolean(item))
        .map((domain) => ({
            ...domain,
            domain: firstNonEmptyString([domain.domain]),
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

function buildQuestionnaireHistoryPdfFallbackFilename() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `Reporte CognIA - Alerta - ${yyyy}-${mm}-${dd}.pdf`;
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
    const firstPage = await getQuestionnaireSessionPageV2(sessionId, { page: 1, page_size: pageSize });
    const firstQuestions = firstPage.items;
    const totalPages = Math.max(1, firstPage.pagination.pages ?? 1);

    if (totalPages <= 1) {
        return firstQuestions;
    }

    const remainingResponses = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
            getQuestionnaireSessionPageV2(sessionId, { page: index + 2, page_size: pageSize })
        )
    );

    const uniqueById = new Map<string, QuestionnaireQuestionV2DTO>();
    [...firstQuestions, ...remainingResponses.flatMap((response) => response.items)].forEach((question) => {
        if (!question?.id || uniqueById.has(question.id)) return;
        uniqueById.set(question.id, question);
    });

    return Array.from(uniqueById.values()).sort((left, right) => (left.position ?? 0) - (right.position ?? 0));
}

export function patchQuestionnaireSessionAnswersV2(sessionId: string, payload: PatchSessionAnswersV2Payload) {
    const requestBody: PatchSessionAnswersV2Payload = {
        include_answers: false,
        ...payload
    };

    if (sensitiveTransportEnabled) {
        return apiSecurePatch<unknown, PatchSessionAnswersV2Payload>(
            `/api/v2/questionnaires/sessions/${sessionId}/answers`,
            requestBody,
            requestOptions
        );
    }

    return apiPatch<unknown, PatchSessionAnswersV2Payload>(
        `/api/v2/questionnaires/sessions/${sessionId}/answers`,
        requestBody,
        requestOptions
    );
}

export function submitQuestionnaireSessionV2(sessionId: string, payload?: { force_reprocess?: boolean }) {
    const requestBody = payload ?? {};
    const request = sensitiveTransportEnabled
        ? apiSecurePost<unknown, { force_reprocess?: boolean }>(
            `/api/v2/questionnaires/sessions/${sessionId}/submit`,
            requestBody,
            requestOptions
        )
        : apiPost<unknown, { force_reprocess?: boolean }>(
            `/api/v2/questionnaires/sessions/${sessionId}/submit`,
            requestBody,
            requestOptions
        );

    return request.then(normalizeSubmitResponse);
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
    const request = sensitiveTransportEnabled
        ? apiSecurePost<unknown, {
            status?: QuestionnaireHistoryStatusFilter;
            page: number;
            page_size: number;
        }>(
            '/api/v2/questionnaires/history/secure',
            {
                status: params?.status,
                page,
                page_size: pageSize
            },
            requestOptions
        )
        : apiGet<unknown>(`/api/v2/questionnaires/history?${query}`, requestOptions);

    return request.then((payload) => normalizeHistoryResponse(payload, page, pageSize));
}

export function getQuestionnaireCasesV2(params?: {
    status?: 'active' | 'archived';
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
    return apiGet<unknown>(`/api/v2/questionnaires/cases?${query}`, requestOptions).then((payload) =>
        normalizeCaseListResponse(payload, page, pageSize)
    );
}

export function createQuestionnaireCaseV2(payload: CreateQuestionnaireCasePayload) {
    const request = sensitiveTransportEnabled
        ? apiSecurePost<unknown, CreateQuestionnaireCasePayload>(
            '/api/v2/questionnaires/cases',
            payload,
            requestOptions
        )
        : apiPost<unknown, CreateQuestionnaireCasePayload>(
            '/api/v2/questionnaires/cases',
            payload,
            requestOptions
        );

    return request.then((payload) => {
        const root = asRecord(payload);
        return normalizeCase(root?.case ?? payload);
    });
}

export function getQuestionnaireCaseDetailV2(caseId: string) {
    return apiGet<unknown>(`/api/v2/questionnaires/cases/${caseId}`, requestOptions).then(normalizeCaseDetailResponse);
}

export function updateQuestionnaireCaseV2(caseId: string, payload: UpdateQuestionnaireCasePayload) {
    const request = sensitiveTransportEnabled
        ? apiSecurePatch<unknown, UpdateQuestionnaireCasePayload>(
            `/api/v2/questionnaires/cases/${caseId}`,
            payload,
            requestOptions
        )
        : apiPatch<unknown, UpdateQuestionnaireCasePayload>(
            `/api/v2/questionnaires/cases/${caseId}`,
            payload,
            requestOptions
        );

    return request.then((payload) => {
        const root = asRecord(payload);
        return normalizeCase(root?.case ?? payload);
    });
}

export function getGuardianQuestionnaireDashboardV2(params?: {
    months?: number;
    date_from?: string;
    date_to?: string;
    case_id?: string;
    case_public_id?: string;
}) {
    const query = buildSearch(params ?? {});
    const path = query ? `/api/v2/questionnaires/guardian/dashboard?${query}` : '/api/v2/questionnaires/guardian/dashboard';
    return apiGet<unknown>(path, requestOptions).then(normalizeGuardianDashboard);
}

export function searchPsychologistsV2(params?: {
    q?: string;
    location?: string;
    page?: number;
    page_size?: number;
}) {
    const page = params?.page ?? 1;
    const pageSize = params?.page_size ?? defaultPageSize;
    const query = buildSearch({
        q: params?.q,
        location: params?.location,
        page,
        page_size: pageSize
    });
    return apiGet<unknown>(`/api/v2/psychologists/search?${query}`, requestOptions).then((payload) =>
        normalizePsychologistSearchResponse(payload, page, pageSize)
    );
}

export function getQuestionnaireHistoryDetailV2(sessionId: string) {
    return apiGet<unknown>(`/api/v2/questionnaires/history/${sessionId}`, requestOptions).then(normalizeHistoryDetail);
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

export function getQuestionnaireClinicalSummaryV2(sessionId: string) {
    const request = sensitiveTransportEnabled
        ? apiSecurePostNoBody<unknown>(
            `/api/v2/questionnaires/history/${sessionId}/clinical-summary`,
            requestOptions
        )
        : apiPostNoBody<unknown>(
            `/api/v2/questionnaires/history/${sessionId}/clinical-summary`,
            requestOptions
        );

    return request.then(normalizeClinicalSummary);
}

export function addQuestionnaireHistoryTagV2(sessionId: string, payload: AddQuestionnaireTagPayload) {
    if (sensitiveTransportEnabled) {
        return apiSecurePost<Record<string, unknown>, AddQuestionnaireTagPayload>(
            `/api/v2/questionnaires/history/${sessionId}/tags`,
            payload,
            requestOptions
        );
    }

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
        const request = sensitiveTransportEnabled
            ? apiSecurePost<unknown, ShareQuestionnairePayload>(
                `/api/v2/questionnaires/history/${sessionId}/share`,
                payload,
                requestOptions
            )
            : apiPost<unknown, ShareQuestionnairePayload>(
                `/api/v2/questionnaires/history/${sessionId}/share`,
                payload,
                requestOptions
            );

        return request.then(normalizeShareResponse);
    }

    const request = sensitiveTransportEnabled
        ? apiSecurePostNoBody<unknown>(
            `/api/v2/questionnaires/history/${sessionId}/share`,
            requestOptions
        )
        : apiPostNoBody<unknown>(
            `/api/v2/questionnaires/history/${sessionId}/share`,
            requestOptions
        );

    return request.then(normalizeShareResponse);
}

export function shareQuestionnaireWithPsychologistV2(sessionId: string, payload: ShareWithPsychologistPayload) {
    const request = sensitiveTransportEnabled
        ? apiSecurePost<unknown, ShareWithPsychologistPayload>(
            `/api/v2/questionnaires/history/${sessionId}/share`,
            payload,
            requestOptions
        )
        : apiPost<unknown, ShareWithPsychologistPayload>(
            `/api/v2/questionnaires/history/${sessionId}/share`,
            payload,
            requestOptions
        );

    return request.then(normalizeShareWithPsychologistResponse);
}

export function getPsychologistQuestionnaireDashboardV2(params?: {
    q?: string;
    case_public_id?: string;
    date_from?: string;
    date_to?: string;
    domain?: string;
    alert_level?: string;
    review_status?: string;
    page?: number;
    page_size?: number;
}) {
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
    return apiGet<unknown>(`/api/v2/questionnaires/psychologist/dashboard?${query}`, requestOptions).then((payload) =>
        normalizePsychologistDashboard(payload, page, pageSize)
    );
}

export function getQuestionnaireProfessionalReviewsV2(sessionId: string) {
    return apiGet<unknown>(`/api/v2/questionnaires/history/${sessionId}/professional-reviews`, requestOptions).then((payload) =>
        asArray(payload).map(normalizeProfessionalReview).filter((item): item is QuestionnaireProfessionalReviewDTO => Boolean(item))
    );
}

export function createQuestionnaireProfessionalReviewV2(sessionId: string, payload: ProfessionalReviewPayload) {
    const request = sensitiveTransportEnabled
        ? apiSecurePost<unknown, ProfessionalReviewPayload>(
            `/api/v2/questionnaires/history/${sessionId}/professional-reviews`,
            payload,
            requestOptions
        )
        : apiPost<unknown, ProfessionalReviewPayload>(
            `/api/v2/questionnaires/history/${sessionId}/professional-reviews`,
            payload,
            requestOptions
        );

    return request.then((response) => normalizeProfessionalReview(response));
}

export function updateQuestionnaireProfessionalReviewV2(sessionId: string, reviewId: string, payload: ProfessionalReviewPayload) {
    const request = sensitiveTransportEnabled
        ? apiSecurePatch<unknown, ProfessionalReviewPayload>(
            `/api/v2/questionnaires/history/${sessionId}/professional-reviews/${reviewId}`,
            payload,
            requestOptions
        )
        : apiPatch<unknown, ProfessionalReviewPayload>(
            `/api/v2/questionnaires/history/${sessionId}/professional-reviews/${reviewId}`,
            payload,
            requestOptions
        );

    return request.then((response) => normalizeProfessionalReview(response));
}

export function getQuestionnaireReportPreviewV2(sessionId: string) {
    const request = sensitiveTransportEnabled
        ? apiSecurePostNoBody<unknown>(
            `/api/v2/questionnaires/history/${sessionId}/report-preview/secure`,
            requestOptions
        )
        : apiPostNoBody<unknown>(
            `/api/v2/questionnaires/history/${sessionId}/report-preview/secure`,
            requestOptions
        );

    return request.then(normalizeReportPreview);
}

export function generateQuestionnaireHistoryPdfV2(sessionId: string) {
    if (sensitiveTransportEnabled) {
        return apiSecurePostNoBody<Record<string, unknown>>(
            `/api/v2/questionnaires/history/${sessionId}/pdf/generate`,
            requestOptions
        );
    }

    return apiPostNoBody<Record<string, unknown>>(
        `/api/v2/questionnaires/history/${sessionId}/pdf/generate`,
        requestOptions
    );
}

export function getQuestionnaireHistoryPdfV2(sessionId: string) {
    const request = sensitiveTransportEnabled
        ? apiSecurePostNoBody<unknown>(
            `/api/v2/questionnaires/history/${sessionId}/pdf/secure`,
            requestOptions
        )
        : apiGet<unknown>(`/api/v2/questionnaires/history/${sessionId}/pdf`, requestOptions);

    return request.then(normalizePdfInfo);
}

export async function downloadQuestionnaireHistoryPdfV2(sessionId: string): Promise<DownloadPdfResult> {
    const result = await apiGetBlobWithMeta(
        `/api/v2/questionnaires/history/${sessionId}/pdf/download`,
        {
            ...requestOptions,
            headers: {
                'Cache-Control': 'no-cache',
                Pragma: 'no-cache'
            }
        }
    );
    const filename = extractFilenameFromHeaders(result.headers) ?? buildQuestionnaireHistoryPdfFallbackFilename();
    return {
        blob: result.blob,
        filename
    };
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
