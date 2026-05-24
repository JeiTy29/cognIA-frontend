import type {
    QuestionnaireAnswerV2DTO,
    QuestionnaireHistoryDetailV2DTO,
    QuestionnaireQuestionV2DTO,
    QuestionnaireReportPreviewDTO
} from '../../services/questionnaires/questionnaires.types';
import {
    normalizeBackendText,
    normalizeBooleanLabel,
    normalizeDomainLabel
} from './presentation';

type PreviewAnswerLike = Record<string, unknown>;
type OptionLike = {
    value: unknown;
    label: string;
};

export type ResolvedAnsweredQuestionRow = {
    key: string;
    questionText: string;
    answerLabel: string;
    domainLabel: string;
    sectionLabel: string;
};

type ResolveAnsweredQuestionRowsArgs = {
    reportPreview: QuestionnaireReportPreviewDTO | null;
    sessionQuestions?: QuestionnaireQuestionV2DTO[];
    sessionDetail?: QuestionnaireHistoryDetailV2DTO | null;
};

function readOptionalString(value: unknown) {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function toComparableKey(value: unknown) {
    const raw = readOptionalString(value);
    return raw ? raw.toLowerCase() : null;
}

function normalizeComparableText(value: unknown) {
    return normalizeBackendText(value, '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeAnswerPrimitive(value: unknown): string | null {
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return String(value);

    const booleanLabel = normalizeBooleanLabel(value, '');
    if (booleanLabel) return booleanLabel;

    if (Array.isArray(value)) {
        const parts: string[] = value
            .map((item) => normalizeAnswerPrimitive(item))
            .filter((item): item is string => Boolean(item));
        return parts.length > 0 ? parts.join(', ') : null;
    }

    if (typeof value === 'object') {
        const record = value as Record<string, unknown>;
        const textCandidates = [
            record.label,
            record.text,
            record.name,
            record.value,
            record.answer,
            record.answer_value,
            record.normalized_answer
        ];

        for (const candidate of textCandidates) {
            const label: string | null = normalizeAnswerPrimitive(candidate);
            if (label) return label;
        }

        return null;
    }

    const text = normalizeBackendText(value, '');
    return text || null;
}

function buildQuestionLookup(questions: QuestionnaireQuestionV2DTO[]) {
    const lookup = new Map<string, QuestionnaireQuestionV2DTO>();

    for (const question of questions) {
        [
            question.id,
            question.question_id,
            question.code,
            question.question_code,
            question.session_item_id
        ].forEach((candidate) => {
            const key = toComparableKey(candidate);
            if (key && !lookup.has(key)) {
                lookup.set(key, question);
            }
        });
    }

    return lookup;
}

function buildAnswerLookup(detail: QuestionnaireHistoryDetailV2DTO | null | undefined) {
    const lookup = new Map<string, QuestionnaireAnswerV2DTO>();
    const rawAnswers = detail?.answers;
    if (!Array.isArray(rawAnswers)) return lookup;

    for (const answer of rawAnswers) {
        [answer.question_id, answer.question_code].forEach((candidate) => {
            const key = toComparableKey(candidate);
            if (key && !lookup.has(key)) {
                lookup.set(key, answer);
            }
        });
    }

    return lookup;
}

function findMatchingQuestion(answer: PreviewAnswerLike, questionLookup: Map<string, QuestionnaireQuestionV2DTO>) {
    for (const candidate of [
        answer.question_id,
        answer.id,
        answer.question_code,
        answer.code,
        answer.session_item_id
    ]) {
        const key = toComparableKey(candidate);
        if (key && questionLookup.has(key)) {
            return questionLookup.get(key) ?? null;
        }
    }

    return null;
}

function findMatchingAnswer(answer: PreviewAnswerLike, answerLookup: Map<string, QuestionnaireAnswerV2DTO>) {
    for (const candidate of [
        answer.question_id,
        answer.id,
        answer.question_code,
        answer.code,
        answer.session_item_id
    ]) {
        const key = toComparableKey(candidate);
        if (key && answerLookup.has(key)) {
            return answerLookup.get(key) ?? null;
        }
    }

    return null;
}

function readResponseOptions(question: QuestionnaireQuestionV2DTO | null, answer: PreviewAnswerLike): OptionLike[] {
    const optionSources = [
        question?.response_options,
        answer.response_options
    ];

    for (const source of optionSources) {
        if (!Array.isArray(source)) continue;

        const options = source
            .map((item) => {
                if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
                const record = item as Record<string, unknown>;
                const label = normalizeBackendText(record.label ?? record.text ?? record.name, '');
                if (!label) return null;
                return {
                    value: record.value,
                    label
                };
            })
            .filter((item): item is OptionLike => Boolean(item));

        if (options.length > 0) {
            return options;
        }
    }

    return [];
}

function resolveOptionLabel(value: unknown, options: OptionLike[]) {
    if (options.length === 0) return null;
    const normalizedValue = normalizeComparableText(value);
    if (!normalizedValue) return null;

    for (const option of options) {
        const optionValueLabel = normalizeComparableText(option.value);
        const optionTextLabel = normalizeComparableText(option.label);
        if (normalizedValue === optionValueLabel || normalizedValue === optionTextLabel) {
            return option.label;
        }
    }

    return null;
}

function resolveQuestionText(answer: PreviewAnswerLike, matchingQuestion: QuestionnaireQuestionV2DTO | null) {
    const candidates = [
        answer.prompt,
        answer.question_text,
        answer.text,
        answer.question,
        answer.statement,
        matchingQuestion?.text,
        matchingQuestion?.prompt,
        matchingQuestion?.question_text,
        matchingQuestion?.statement,
        matchingQuestion?.label,
        matchingQuestion?.title
    ];

    for (const candidate of candidates) {
        const text = normalizeBackendText(candidate, '');
        if (text) return text;
    }

    return 'Pregunta no disponible';
}

function resolveAnswerLabel(
    answer: PreviewAnswerLike,
    matchingQuestion: QuestionnaireQuestionV2DTO | null,
    matchingAnswer: QuestionnaireAnswerV2DTO | null
) {
    const responseOptions = readResponseOptions(matchingQuestion, answer);
    const candidates = [
        answer.normalized_answer,
        answer.raw_answer_display,
        answer.answer_value,
        answer.answer,
        answer.raw_answer,
        matchingAnswer?.answer_value,
        matchingAnswer?.answer,
        matchingQuestion?.answer_value,
        matchingQuestion?.answer
    ];

    for (const candidate of candidates) {
        const optionLabel = resolveOptionLabel(candidate, responseOptions);
        if (optionLabel) return optionLabel;

        const label = normalizeAnswerPrimitive(candidate);
        if (label) return label;
    }

    return 'No disponible';
}

function resolveSectionLabel(answer: PreviewAnswerLike, matchingQuestion: QuestionnaireQuestionV2DTO | null) {
    const candidates = [
        answer.section_title,
        answer.section,
        matchingQuestion?.section_title,
        matchingQuestion?.section
    ];

    for (const candidate of candidates) {
        const label = normalizeBackendText(candidate, '');
        if (label) return label;
    }

    return 'General';
}

function inferDomainLabel(rawValue: string) {
    const normalized = rawValue.toLowerCase();

    if (/(adhd|inatt|hypimp)/.test(normalized)) return 'TDAH';
    if (/(conduct|odd|dmdd|outburst)/.test(normalized)) return 'Conducta';
    if (/(elimination|enuresis|encopresis)/.test(normalized)) return 'Eliminación';
    if (/(anxiety|gad|agor|worry|panic|separation|social)/.test(normalized)) return 'Ansiedad';
    if (/(depression|mdd|pdd|depressive|mood)/.test(normalized)) return 'Depresión';

    return normalizeDomainLabel(rawValue);
}

function resolveDomainLabel(answer: PreviewAnswerLike, matchingQuestion: QuestionnaireQuestionV2DTO | null) {
    const candidates: unknown[] = [
        answer.domain,
        matchingQuestion?.domain,
        matchingQuestion?.section_domain,
        matchingQuestion?.feature,
        matchingQuestion?.domains_final,
        matchingQuestion?.question_code,
        matchingQuestion?.code
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
            for (const item of candidate) {
                const raw = readOptionalString(item);
                if (raw) return inferDomainLabel(raw);
            }
            continue;
        }

        const raw = readOptionalString(candidate);
        if (raw) return inferDomainLabel(raw);
    }

    return 'General';
}

export function resolveAnsweredQuestionRows({
    reportPreview,
    sessionQuestions = [],
    sessionDetail = null
}: ResolveAnsweredQuestionRowsArgs): ResolvedAnsweredQuestionRow[] {
    const previewAnswers = Array.isArray(reportPreview?.answers) ? reportPreview.answers : [];
    if (previewAnswers.length === 0) return [];

    const questionLookup = buildQuestionLookup(sessionQuestions);
    const answerLookup = buildAnswerLookup(sessionDetail);

    return previewAnswers.map((answer, index) => {
        const rawAnswer = answer as PreviewAnswerLike;
        const matchingQuestion = findMatchingQuestion(rawAnswer, questionLookup);
        const matchingAnswer = findMatchingAnswer(rawAnswer, answerLookup);
        const key =
            readOptionalString(rawAnswer.question_id) ??
            readOptionalString(rawAnswer.question_code) ??
            readOptionalString(rawAnswer.session_item_id) ??
            `answer-${index}`;

        return {
            key,
            questionText: resolveQuestionText(rawAnswer, matchingQuestion),
            answerLabel: resolveAnswerLabel(rawAnswer, matchingQuestion, matchingAnswer),
            domainLabel: resolveDomainLabel(rawAnswer, matchingQuestion),
            sectionLabel: resolveSectionLabel(rawAnswer, matchingQuestion)
        };
    });
}
