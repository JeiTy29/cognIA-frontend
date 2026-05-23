import type {
    QuestionnaireClinicalDomainV2DTO,
    QuestionnaireClinicalSummaryV2DTO,
    QuestionnaireEvaluationDomainDTO,
    QuestionnaireHistoryDetailV2DTO,
    QuestionnaireProfessionalReviewDTO,
    QuestionnaireQuestionV2DTO,
    QuestionnaireReportPreviewDTO,
    QuestionnaireResponseType,
    QuestionnaireResponseValue,
    QuestionnaireSecureResultsV2DTO,
    QuestionnaireSessionV2DTO
} from '../../services/questionnaires/questionnaires.types';
import {
    buildQuestionAnswerLabel,
    formatDomainLabel,
    normalizeClinicalTextPresentation
} from '../presentation/clinicalReport';
import {
    getAlertLevelLabel,
    getConfidenceBandLabel,
    getModeLabel,
    getRoleLabel,
    getStatusLabel,
    normalizeMojibakeText
} from '../presentation/naturalLanguage';
import { formatQuestionType, formatReportPercent } from './reportFormatting';

export type AnsweredQuestionReportRow = {
    index: number;
    sectionLabel: string;
    domainLabel: string;
    questionText: string;
    answerLabel: string;
    responseTypeLabel: string;
    relativeScore: number | null;
    categoryLabel: string;
};

export type QuestionnaireDomainReportRow = {
    key: string;
    domainLabel: string;
    probabilityValue: number | null;
    probabilityLabel: string;
    levelLabel: string;
    confidenceLabel: string;
};

export type QuestionnaireSectionSummaryRow = {
    sectionLabel: string;
    answeredCount: number;
};

export type DomainIntensityRow = {
    label: string;
    value: number;
    interpretedCount: number;
    totalCount: number;
};

export type DomainSignalRow = {
    domainLabel: string;
    noSignal: number;
    low: number;
    medium: number;
    high: number;
    total: number;
    weightedScore: number;
};

export type HighIntensityQuestionRow = {
    domainLabel: string;
    questionText: string;
    answerLabel: string;
    intensityValue: number;
    intensityLabel: string;
    originalIndex: number;
};

export type QuestionnaireCompletionSummary = {
    answeredCount: number;
    totalQuestions: number;
    ratio: number;
    ratioLabel: string;
    modeLabel: string;
    roleLabel: string;
    statusLabel: string;
};

export type QuestionnaireAlertReportDataset = {
    answeredQuestions: AnsweredQuestionReportRow[];
    answeredQuestionsNotice: string | null;
    professionalReviews: QuestionnaireProfessionalReviewDTO[];
    domainRows: QuestionnaireDomainReportRow[];
    sectionSummaryRows: QuestionnaireSectionSummaryRow[];
    domainIntensity: DomainIntensityRow[];
    domainSignals: DomainSignalRow[];
    highIntensityQuestions: HighIntensityQuestionRow[];
    completion: QuestionnaireCompletionSummary;
    summaryText: string;
    recommendationText: string;
    clarificationText: string;
    disclaimerText: string;
    sectionNarratives: Array<{ title: string; content: string }>;
};

type BuildDatasetArgs = {
    sessionDetail: QuestionnaireHistoryDetailV2DTO | QuestionnaireSessionV2DTO | null;
    sessionQuestions: QuestionnaireQuestionV2DTO[];
    results: QuestionnaireSecureResultsV2DTO | null;
    clinicalSummary: QuestionnaireClinicalSummaryV2DTO | null;
    reportPreview?: QuestionnaireReportPreviewDTO | null;
};

type PrimitiveAnswer = string | number | boolean | null;
type ResponseOption = {
    value: unknown;
    label: string;
};

function normalizeLookupKey(value: unknown) {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '';
}

function toFiniteNumber(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value.replace(',', '.'));
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function isPrimitiveAnswer(value: unknown): value is PrimitiveAnswer {
    return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function normalizeQuestionType(value: unknown): QuestionnaireResponseType {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (normalized === 'count') return 'integer';
    if (normalized === 'text_context') return 'text';
    if (normalized === 'numeric' || normalized === 'float' || normalized === 'decimal') return 'number';
    return normalized as QuestionnaireResponseType;
}

function normalizeComparableText(value: unknown) {
    return normalizeMojibakeText(String(value ?? ''))
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeAnswerDictionary(value: unknown): Record<string, QuestionnaireResponseValue> {
    const next: Record<string, QuestionnaireResponseValue> = {};
    if (!value) return next;

    const assignValue = (keys: unknown[], answerValue: QuestionnaireResponseValue) => {
        keys.forEach((key) => {
            const normalized = normalizeLookupKey(key);
            if (!normalized) return;
            next[normalized] = answerValue;
        });
    };

    if (Array.isArray(value)) {
        value.forEach((item) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) return;
            const record = item as Record<string, unknown>;
            const answerValue = pickAnswerRecordValue(record);
            if (answerValue === undefined) return;
            assignValue(
                [
                    record.question_id,
                    record.questionId,
                    record.id,
                    record.item_id,
                    record.questionnaire_item_id,
                    record.question_code,
                    record.code
                ],
                answerValue
            );
        });
        return next;
    }

    if (typeof value === 'object') {
        Object.entries(value as Record<string, unknown>).forEach(([key, itemValue]) => {
            if (isPrimitiveAnswer(itemValue)) {
                next[key] = itemValue;
            }
        });
    }

    return next;
}

function pickAnswerRecordValue(record: Record<string, unknown>) {
    const candidates = [
        record.answer,
        record.value,
        record.response,
        record.response_value,
        record.selected_value,
        record.current_answer,
        record.answer_value
    ];

    for (const candidate of candidates) {
        if (candidate === null) return null;
        if (typeof candidate === 'string' || typeof candidate === 'number' || typeof candidate === 'boolean') {
            return candidate;
        }
    }

    return undefined;
}

function buildQuestionLookupKeys(question: QuestionnaireQuestionV2DTO) {
    const raw = question as Record<string, unknown>;
    return [
        normalizeLookupKey(question.id),
        normalizeLookupKey(question.code),
        normalizeLookupKey(raw.question_id),
        normalizeLookupKey(raw.question_code),
        normalizeLookupKey(raw.item_id),
        normalizeLookupKey(raw.questionnaire_item_id),
        normalizeLookupKey(raw.session_item_id)
    ].filter((value, index, items) => value.length > 0 && items.indexOf(value) === index);
}

function findAnswerForQuestion(
    answers: Record<string, QuestionnaireResponseValue>,
    question: QuestionnaireQuestionV2DTO
) {
    for (const key of buildQuestionLookupKeys(question)) {
        if (Object.hasOwn(answers, key)) {
            return answers[key];
        }
    }
    return undefined;
}

function coerceAnswerForQuestion(question: QuestionnaireQuestionV2DTO, value: QuestionnaireResponseValue | undefined) {
    if (value === null || value === undefined) return value;

    const type = normalizeQuestionType(question.response_type);
    if (type === 'boolean') {
        if (typeof value === 'boolean') return value;
        const text = normalizeComparableText(value);
        if (['true', '1', 'si', 'yes'].includes(text)) return true;
        if (['false', '0', 'no'].includes(text)) return false;
        return value;
    }

    if (['integer', 'number', 'count', 'likert', 'likert_0_4', 'likert_1_5', 'frequency_0_3', 'intensity_0_10'].includes(type)) {
        const parsed = toFiniteNumber(value);
        if (parsed !== null) {
            return type === 'number' ? parsed : Math.trunc(parsed);
        }
    }

    return value;
}

function getQuestionText(question: QuestionnaireQuestionV2DTO) {
    const raw = question as Record<string, unknown>;
    return normalizeClinicalTextPresentation(
        raw.text ?? raw.prompt ?? raw.question_text ?? raw.question ?? raw.statement ?? raw.title ?? raw.label,
        'No fue posible recuperar el texto completo de la pregunta.'
    );
}

function inferDomainFromText(value: string | null | undefined) {
    const normalized = normalizeComparableText(value);
    if (!normalized) return null;
    if (/(adhd|tdah|inatt|hypimp)/.test(normalized)) return 'TDAH';
    if (/(conduct|odd|dmdd|outburst)/.test(normalized)) return 'Conducta';
    if (/(elimination|enuresis|encopresis)/.test(normalized)) return 'Eliminación';
    if (/(anxiety|ansiedad|anx|gad|agor|social|separation|panic|worry)/.test(normalized)) return 'Ansiedad';
    if (/(depression|depres|depr|mdd|pdd|depressive|mood)/.test(normalized)) return 'Depresión';
    return null;
}

function resolveKnownDomain(value: unknown) {
    if (typeof value !== 'string' || value.trim().length === 0) return null;
    const inferred = inferDomainFromText(value);
    if (inferred) return inferred;

    const normalized = normalizeComparableText(value).replace(/-/g, '_');
    if (['adhd', 'conduct', 'elimination', 'anxiety', 'depression', 'general'].includes(normalized)) {
        return formatDomainLabel(value);
    }

    return null;
}

function resolveQuestionDomain(question: QuestionnaireQuestionV2DTO) {
    const raw = question as Record<string, unknown>;
    const directDomain = typeof raw.domain === 'string' ? inferDomainFromText(raw.domain) : null;
    if (directDomain) return directDomain;

    const domainArray = Array.isArray(raw.domains_final) ? raw.domains_final : [raw.domains_final];
    for (const candidate of domainArray) {
        if (typeof candidate === 'string') {
            const inferred = inferDomainFromText(candidate);
            if (inferred) return inferred;
        }
    }

    const technicalCandidates: unknown[] = [
        raw.question_code,
        raw.code,
        raw.feature,
        raw.domain_label,
        raw.area,
        raw.section_domain
    ];
    for (const candidate of technicalCandidates) {
        if (typeof candidate === 'string') {
            const inferred = inferDomainFromText(candidate);
            if (inferred) return inferred;
        }
    }

    if (typeof raw.domain === 'string' && raw.domain.trim().length > 0) {
        const normalized = normalizeComparableText(raw.domain);
        if (['adhd', 'conduct', 'elimination', 'anxiety', 'depression'].includes(normalized)) {
            return formatDomainLabel(raw.domain);
        }
    }

    return 'General';
}

function resolveSectionLabel(question: QuestionnaireQuestionV2DTO) {
    const raw = question as Record<string, unknown>;
    return normalizeClinicalTextPresentation(raw.section_title ?? raw.section ?? 'General', 'General');
}

function getQuestionScale(question: QuestionnaireQuestionV2DTO) {
    const raw = question as Record<string, unknown>;
    const explicitMin = [
        question.response_min,
        question.min_value,
        question.min,
        question.minimum,
        raw.min_value,
        raw.min,
        raw.minimum
    ].map(toFiniteNumber).find((value) => value !== null) ?? null;
    const explicitMax = [
        question.response_max,
        question.max_value,
        question.max,
        question.maximum,
        raw.max_value,
        raw.max,
        raw.maximum
    ].map(toFiniteNumber).find((value) => value !== null) ?? null;
    if (explicitMin !== null || explicitMax !== null) {
        return { min: explicitMin, max: explicitMax };
    }

    const responseType = normalizeQuestionType(question.response_type);
    if (responseType === 'likert_0_4') return { min: 0, max: 4 };
    if (responseType === 'likert_1_5' || responseType === 'likert') return { min: 1, max: 5 };
    if (responseType === 'frequency_0_3') return { min: 0, max: 3 };
    if (responseType === 'intensity_0_10') return { min: 0, max: 10 };
    if (responseType === 'boolean') return { min: 0, max: 1 };
    return { min: null, max: null };
}

function extractResponseOptions(question: QuestionnaireQuestionV2DTO): ResponseOption[] {
    const options = question.response_options;
    if (!Array.isArray(options)) return [];
    return options
        .map((option) => {
            if (option && typeof option === 'object' && !Array.isArray(option)) {
                const record = option as Record<string, unknown>;
                return {
                    value: record.value ?? record.id ?? record.key ?? record.code ?? record.answer,
                    label: normalizeMojibakeText(String(record.label ?? record.text ?? record.name ?? record.title ?? record.value ?? ''))
                };
            }
            return {
                value: option,
                label: normalizeMojibakeText(String(option))
            };
        })
        .filter((option) => option.label.trim().length > 0);
}

function toNumericOptionValue(value: unknown) {
    if (typeof value === 'boolean') return value ? 1 : 0;
    return toFiniteNumber(value);
}

function knownTextScore(label: string, min: number | null, max: number | null) {
    const normalized = normalizeComparableText(label);
    const safeMin = min ?? 0;
    const safeMax = max ?? Math.max(1, safeMin + 1);
    const midpoint = safeMin + (safeMax - safeMin) * 0.5;

    if (!normalized) return null;
    if (/(nunca|ausente|no ocurrio|sin impacto|ninguno|ninguna|nada|no\b)/.test(normalized)) return safeMin;
    if (/(leve|ocasional|algo|poco)/.test(normalized)) return safeMin + Math.max(1, (safeMax - safeMin) * 0.33);
    if (/(moderad|media|intermedi)/.test(normalized)) return midpoint;
    if (/(claro|frecuente|muy frecuente|severo|alto|mucho|si\b)/.test(normalized)) return safeMax;
    return null;
}

function resolveAnswerLabel(question: QuestionnaireQuestionV2DTO, answer: QuestionnaireResponseValue) {
    const raw = question as Record<string, unknown>;
    const answerValue = typeof raw.answer_value === 'string' ? raw.answer_value : null;
    return buildQuestionAnswerLabel(question, answer, answerValue);
}

function resolveNumericAnswerForImpact(question: QuestionnaireQuestionV2DTO, answer: QuestionnaireResponseValue, answerLabel: string) {
    const raw = question as Record<string, unknown>;
    const directCandidates = [
        answer,
        raw.answer,
        raw.answer_value,
        raw.normalized_answer,
        raw.value
    ];
    for (const candidate of directCandidates) {
        if (typeof candidate === 'boolean') return candidate ? 1 : 0;
        const numeric = toFiniteNumber(candidate);
        if (numeric !== null) return numeric;
    }

    const options = extractResponseOptions(question);
    const answerComparable = normalizeComparableText(answerLabel);
    const rawAnswerComparable = normalizeComparableText(answer);
    for (const option of options) {
        const optionComparable = normalizeComparableText(option.label);
        const optionValueComparable = normalizeComparableText(option.value);
        if (
            optionComparable === answerComparable ||
            optionComparable === rawAnswerComparable ||
            optionValueComparable === answerComparable ||
            optionValueComparable === rawAnswerComparable
        ) {
            const numeric = toNumericOptionValue(option.value);
            if (numeric !== null) return numeric;
        }
    }

    const { min, max } = getQuestionScale(question);
    return knownTextScore(answerLabel, min, max);
}

function classifyScaledResponse(relativeScore: number) {
    if (relativeScore <= 0.05) return 'Sin señal relevante';
    if (relativeScore <= 0.33) return 'Señal baja';
    if (relativeScore <= 0.66) return 'Señal intermedia';
    return 'Señal alta';
}

function classifyAnswer(question: QuestionnaireQuestionV2DTO, answer: QuestionnaireResponseValue, answerLabel: string) {
    const responseType = normalizeQuestionType(question.response_type);
    if (responseType === 'text') {
        return { relativeScore: null, categoryLabel: 'Contextual' };
    }

    if (responseType === 'boolean') {
        const normalizedBoolean =
            typeof answer === 'boolean'
                ? answer
                : ['true', '1', 'si', 'yes'].includes(normalizeComparableText(answer));
        return normalizedBoolean
            ? { relativeScore: 1, categoryLabel: 'Señal alta' }
            : { relativeScore: 0, categoryLabel: 'Sin señal relevante' };
    }

    const numeric = resolveNumericAnswerForImpact(question, answer, answerLabel);
    const { min, max } = getQuestionScale(question);
    if (numeric !== null && min !== null && max !== null && max > min) {
        const relativeScore = Math.min(1, Math.max(0, (numeric - min) / (max - min)));
        return {
            relativeScore,
            categoryLabel: classifyScaledResponse(relativeScore)
        };
    }

    if (numeric !== null && max !== null && max > 0) {
        const relativeScore = Math.min(1, Math.max(0, numeric / max));
        return {
            relativeScore,
            categoryLabel: classifyScaledResponse(relativeScore)
        };
    }

    return { relativeScore: null, categoryLabel: 'No interpretable' };
}

function buildAnswerRowFromQuestion(
    question: QuestionnaireQuestionV2DTO,
    answerLookup: Record<string, QuestionnaireResponseValue>,
    index: number
) {
    const raw = question as Record<string, unknown>;
    const embeddedAnswer = pickAnswerRecordValue(raw);
    const answer = embeddedAnswer !== undefined
        ? coerceAnswerForQuestion(question, embeddedAnswer)
        : coerceAnswerForQuestion(question, findAnswerForQuestion(answerLookup, question));

    if (answer === undefined || answer === null || (typeof answer === 'string' && answer.trim().length === 0)) {
        return null;
    }

    const answerLabel = resolveAnswerLabel(question, answer);
    const classification = classifyAnswer(question, answer, answerLabel);
    return {
        index,
        sectionLabel: resolveSectionLabel(question),
        domainLabel: resolveQuestionDomain(question),
        questionText: getQuestionText(question),
        answerLabel,
        responseTypeLabel: formatQuestionType(question.response_type),
        relativeScore: classification.relativeScore,
        categoryLabel: classification.categoryLabel
    } satisfies AnsweredQuestionReportRow;
}

function buildFallbackAnswerRows(
    sessionDetail: QuestionnaireHistoryDetailV2DTO | QuestionnaireSessionV2DTO | null
) {
    const answers = Array.isArray(sessionDetail?.answers) ? sessionDetail.answers : [];
    return answers
        .map((item, index) => {
            const record = item as Record<string, unknown>;
            const answer = pickAnswerRecordValue(record);
            if (answer === undefined || answer === null || (typeof answer === 'string' && answer.trim().length === 0)) {
                return null;
            }

            const domainLabel = inferDomainFromText(
                typeof record.question_code === 'string'
                    ? record.question_code
                    : (typeof record.question_id === 'string' ? record.question_id : '')
            ) ?? 'General';

            const answerLabel =
                typeof answer === 'boolean'
                    ? (answer ? 'Sí' : 'No')
                    : normalizeMojibakeText(String(answer));

            const categoryLabel =
                typeof answer === 'boolean'
                    ? (answer ? 'Señal alta' : 'Sin señal relevante')
                    : 'No interpretable';

            return {
                index: index + 1,
                sectionLabel: normalizeClinicalTextPresentation(record.section, 'General'),
                domainLabel,
                questionText: 'No fue posible recuperar el texto completo de la pregunta.',
                answerLabel,
                responseTypeLabel: 'Respuesta registrada',
                relativeScore: typeof answer === 'boolean' ? (answer ? 1 : 0) : null,
                categoryLabel
            } satisfies AnsweredQuestionReportRow;
        })
        .filter((item): item is AnsweredQuestionReportRow => item !== null);
}

function buildPreviewAnswerRows(reportPreview: QuestionnaireReportPreviewDTO | null) {
    const answers = reportPreview?.answers ?? [];
    return answers
        .map((item, index) => {
            const domainLabel = resolveKnownDomain(item.domain) ?? inferDomainFromText(item.question_code ?? item.prompt ?? '') ?? 'General';
            const answerLabel = normalizeMojibakeText(item.normalized_answer ?? item.raw_answer_display ?? String(item.raw_answer ?? '--'));
            const pseudoQuestion = {
                response_type: 'text',
                response_options: null,
                response_min: null,
                response_max: null
            } as unknown as QuestionnaireQuestionV2DTO;
            const classification = classifyAnswer(pseudoQuestion, item.raw_answer ?? item.normalized_answer ?? null, answerLabel);

            return {
                index: index + 1,
                sectionLabel: normalizeClinicalTextPresentation(item.section_title, 'General'),
                domainLabel,
                questionText: normalizeClinicalTextPresentation(item.prompt, 'Pregunta no disponible'),
                answerLabel,
                responseTypeLabel: 'Respuesta registrada',
                relativeScore: classification.relativeScore,
                categoryLabel: classification.categoryLabel
            } satisfies AnsweredQuestionReportRow;
        })
        .filter((item): item is AnsweredQuestionReportRow => item !== null);
}

export function buildAnsweredQuestionsDataset({
    sessionDetail,
    sessionQuestions,
    reportPreview
}: Pick<BuildDatasetArgs, 'sessionDetail' | 'sessionQuestions' | 'reportPreview'>) {
    const answerLookup = normalizeAnswerDictionary(sessionDetail?.answers);
    const rows = sessionQuestions
        .map((question, index) => buildAnswerRowFromQuestion(question, answerLookup, index + 1))
        .filter((item): item is AnsweredQuestionReportRow => item !== null);

    if (rows.length > 0) {
        return { rows, notice: null };
    }

    const fallbackRows = buildFallbackAnswerRows(sessionDetail);
    if (fallbackRows.length > 0) {
        return {
            rows: fallbackRows,
            notice: 'No fue posible recuperar el texto completo de algunas preguntas, pero se muestran las respuestas disponibles.'
        };
    }

    const previewRows = buildPreviewAnswerRows(reportPreview ?? null);
    if (previewRows.length > 0) {
        return {
            rows: previewRows,
            notice: 'Se usó la vista previa segura del reporte para reconstruir las respuestas visibles de la sesión.'
        };
    }

    if (import.meta.env.DEV) {
        console.debug('[questionnaire-pdf] answered questions unavailable');
    }

    return {
        rows: [],
        notice: 'No fue posible recuperar el detalle de preguntas contestadas para esta sesión.'
    };
}

function normalizeRiskLabel(value: unknown) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (normalized === 'baja' || normalized === 'low') return 'Baja';
    if (normalized === 'intermedia' || normalized === 'medium' || normalized === 'moderate') return 'Intermedia';
    if (normalized === 'relevante') return 'Relevante';
    if (normalized === 'alta' || normalized === 'high' || normalized === 'severe') return 'Alta';
    return normalizeClinicalTextPresentation(getAlertLevelLabel(value), 'No disponible');
}

function buildDomainRowsFromResults(
    resultsDomains: QuestionnaireEvaluationDomainDTO[],
    clinicalDomains: QuestionnaireClinicalDomainV2DTO[]
) {
    const map = new Map<string, QuestionnaireDomainReportRow>();

    resultsDomains.forEach((domain, index) => {
        const domainLabel = formatDomainLabel(domain.domain ?? `Dominio ${index + 1}`);
        map.set(domainLabel, {
            key: domainLabel,
            domainLabel,
            probabilityValue: toFiniteNumber(domain.probability),
            probabilityLabel: formatReportPercent(domain.probability, '--'),
            levelLabel: normalizeRiskLabel(domain.alert_level),
            confidenceLabel: normalizeClinicalTextPresentation(getConfidenceBandLabel(domain.confidence_band), '--')
        });
    });

    clinicalDomains.forEach((domain, index) => {
        const domainLabel = formatDomainLabel(domain.domain ?? `Dominio ${index + 1}`);
        const current = map.get(domainLabel);
        const nextProbability = toFiniteNumber(domain.probability);
        map.set(domainLabel, {
            key: domainLabel,
            domainLabel,
            probabilityValue: current?.probabilityValue ?? nextProbability,
            probabilityLabel: current?.probabilityLabel ?? formatReportPercent(domain.probability, '--'),
            levelLabel: normalizeRiskLabel(domain.compatibility_level ?? domain.risk_level),
            confidenceLabel:
                normalizeClinicalTextPresentation(getConfidenceBandLabel(domain.confidence_band), current?.confidenceLabel ?? '--')
        });
    });

    return Array.from(map.values()).sort((left, right) => (right.probabilityValue ?? -1) - (left.probabilityValue ?? -1));
}

function buildSectionNarratives(clinicalSummary: QuestionnaireClinicalSummaryV2DTO | null) {
    const sections = clinicalSummary?.sections;
    if (Array.isArray(sections)) {
        return sections
            .map((section) => ({
                title: normalizeClinicalTextPresentation(section.title, ''),
                content: normalizeClinicalTextPresentation(section.content, '')
            }))
            .filter((section) => section.title && section.content);
    }

    if (sections && typeof sections === 'object') {
        return Object.entries(sections)
            .map(([key, value]) => ({
                title: normalizeClinicalTextPresentation(key.replace(/_/g, ' '), ''),
                content: normalizeClinicalTextPresentation(value, '')
            }))
            .filter((section) => section.title && section.content);
    }

    return [];
}

function buildCompletionSummary(
    sessionDetail: QuestionnaireHistoryDetailV2DTO | QuestionnaireSessionV2DTO | null,
    answeredRows: AnsweredQuestionReportRow[],
    sessionQuestions: QuestionnaireQuestionV2DTO[]
) {
    const answeredCount = toFiniteNumber(sessionDetail?.answered_count) ?? answeredRows.length;
    const totalQuestions = toFiniteNumber(sessionDetail?.total_questions) ?? (sessionQuestions.length > 0 ? sessionQuestions.length : answeredCount);
    const safeTotal = totalQuestions > 0 ? totalQuestions : answeredCount;
    const ratio = safeTotal > 0 ? Math.min(1, Math.max(0, answeredCount / safeTotal)) : 0;

    return {
        answeredCount,
        totalQuestions: safeTotal,
        ratio,
        ratioLabel: formatReportPercent(ratio, '--'),
        modeLabel: getModeLabel(sessionDetail?.mode, '--'),
        roleLabel: getRoleLabel(sessionDetail?.role, '--'),
        statusLabel: getStatusLabel(sessionDetail?.status, '--')
    } satisfies QuestionnaireCompletionSummary;
}

function buildDomainIntensity(rows: AnsweredQuestionReportRow[]) {
    const groups = new Map<string, { totalCount: number; interpretedCount: number; sum: number }>();
    rows.forEach((row) => {
        const current = groups.get(row.domainLabel) ?? { totalCount: 0, interpretedCount: 0, sum: 0 };
        current.totalCount += 1;
        if (typeof row.relativeScore === 'number') {
            current.interpretedCount += 1;
            current.sum += row.relativeScore;
        }
        groups.set(row.domainLabel, current);
    });

    return Array.from(groups.entries())
        .filter(([, value]) => value.interpretedCount > 0)
        .map(([label, value]) => ({
            label,
            value: (value.sum / value.interpretedCount) * 100,
            interpretedCount: value.interpretedCount,
            totalCount: value.totalCount
        }))
        .sort((left, right) => right.value - left.value);
}

function buildDomainSignals(rows: AnsweredQuestionReportRow[]) {
    const groups = new Map<string, Omit<DomainSignalRow, 'weightedScore'>>();
    rows.forEach((row) => {
        const current = groups.get(row.domainLabel) ?? {
            domainLabel: row.domainLabel,
            noSignal: 0,
            low: 0,
            medium: 0,
            high: 0,
            total: 0
        };
        current.total += 1;
        if (row.categoryLabel === 'Sin señal relevante') current.noSignal += 1;
        if (row.categoryLabel === 'Señal baja') current.low += 1;
        if (row.categoryLabel === 'Señal intermedia') current.medium += 1;
        if (row.categoryLabel === 'Señal alta') current.high += 1;
        groups.set(row.domainLabel, current);
    });

    return Array.from(groups.values())
        .filter((row) => row.noSignal + row.low + row.medium + row.high > 0)
        .map((row) => ({
            ...row,
            weightedScore:
                row.total > 0
                    ? (((row.low * 1) + (row.medium * 2) + (row.high * 3)) / (row.total * 3)) * 100
                    : 0
        }))
        .sort((left, right) =>
            right.high - left.high ||
            right.medium - left.medium ||
            right.low - left.low ||
            right.total - left.total
        );
}

function buildHighIntensityQuestions(rows: AnsweredQuestionReportRow[]) {
    return rows
        .filter((row) => typeof row.relativeScore === 'number' && row.relativeScore > 0)
        .map((row) => ({
            domainLabel: row.domainLabel,
            questionText: row.questionText,
            answerLabel: row.answerLabel,
            intensityValue: (row.relativeScore ?? 0) * 100,
            intensityLabel: formatReportPercent(row.relativeScore ?? 0, '0 %'),
            originalIndex: row.index
        } satisfies HighIntensityQuestionRow))
        .sort((left, right) =>
            right.intensityValue - left.intensityValue ||
            left.domainLabel.localeCompare(right.domainLabel, 'es-CO') ||
            left.originalIndex - right.originalIndex
        )
        .slice(0, 8);
}

export function buildQuestionnaireAlertReportDataset({
    sessionDetail,
    sessionQuestions,
    results,
    clinicalSummary,
    reportPreview
}: BuildDatasetArgs): QuestionnaireAlertReportDataset {
    const answered = buildAnsweredQuestionsDataset({ sessionDetail, sessionQuestions, reportPreview });
    const completion = buildCompletionSummary(sessionDetail, answered.rows, sessionQuestions);

    const sectionSummaryRows = Array.from(
        answered.rows.reduce((map, row) => {
            map.set(row.sectionLabel, (map.get(row.sectionLabel) ?? 0) + 1);
            return map;
        }, new Map<string, number>())
    )
        .map(([sectionLabel, answeredCount]) => ({ sectionLabel, answeredCount }))
        .sort((left, right) => right.answeredCount - left.answeredCount);

    const domainIntensity = buildDomainIntensity(answered.rows);
    const domainSignals = buildDomainSignals(answered.rows);
    const highIntensityQuestions = buildHighIntensityQuestions(answered.rows);
    const domainRows = buildDomainRowsFromResults(results?.domains ?? [], clinicalSummary?.domains ?? []);
    const sectionNarratives = buildSectionNarratives(clinicalSummary);

    const summaryText = normalizeClinicalTextPresentation(
        clinicalSummary?.simulated_diagnostic_text?.sintesis_general ?? results?.result?.summary,
        'No fue posible recuperar una síntesis general para esta sesión.'
    );
    const recommendationText = normalizeClinicalTextPresentation(
        clinicalSummary?.simulated_diagnostic_text?.recomendacion_profesional ?? results?.result?.operational_recommendation,
        'Se recomienda revisar este resultado con apoyo profesional si las señales observadas generan preocupación.'
    );
    const clarificationText = normalizeClinicalTextPresentation(
        clinicalSummary?.simulated_diagnostic_text?.aclaracion_importante,
        'La lectura interpretativa se calcula a partir de las escalas de respuesta disponibles y no representa un diagnóstico individual.'
    );
    const disclaimerText = normalizeClinicalTextPresentation(
        clinicalSummary?.disclaimer,
        'Este reporte es orientativo y no reemplaza una evaluación profesional.'
    );

    return {
        answeredQuestions: answered.rows,
        answeredQuestionsNotice: answered.notice,
        professionalReviews: reportPreview?.professional_reviews ?? [],
        domainRows,
        sectionSummaryRows,
        domainIntensity,
        domainSignals,
        highIntensityQuestions,
        completion,
        summaryText,
        recommendationText,
        clarificationText,
        disclaimerText,
        sectionNarratives
    };
}
