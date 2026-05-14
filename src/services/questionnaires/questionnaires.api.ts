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
    ShareQuestionnairePayload
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
        session_id: resolveHistorySessionId(root, id),
        questionnaire_session_id: resolveHistoryQuestionnaireSessionId(root, id),
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
        requestOptions
    );
    const filename = extractFilenameFromHeaders(result.headers) ?? `cuestionario-${sessionId}.pdf`;
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
