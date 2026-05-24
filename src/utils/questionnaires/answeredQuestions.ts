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

function normalizeAnswerPrimitive(value: unknown) {
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return String(value);
    const booleanLabel = normalizeBooleanLabel(value, '');
    if (booleanLabel) return booleanLabel;
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
        [
            answer.question_id,
            answer.question_code
        ].forEach((candidate) => {
            const key = toComparableKey(candidate);
            if (key && !lookup.has(key)) {
                lookup.set(key, answer);
            }
        });
    }

    return lookup;
}

function findMatchingQuestion(
    answer: PreviewAnswerLike,
    questionLookup: Map<string, QuestionnaireQuestionV2DTO>
) {
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

function findMatchingAnswer(
    answer: PreviewAnswerLike,
    answerLookup: Map<string, QuestionnaireAnswerV2DTO>
) {
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
        const label = normalizeAnswerPrimitive(candidate);
        if (label) return label;
    }

    return '--';
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

function resolveDomainLabel(answer: PreviewAnswerLike, matchingQuestion: QuestionnaireQuestionV2DTO | null) {
    const candidates = [
        answer.domain,
        matchingQuestion?.domain,
        matchingQuestion?.section_domain,
        matchingQuestion?.feature,
        matchingQuestion?.domains_final
    ];

    for (const candidate of candidates) {
        const raw = readOptionalString(candidate);
        if (raw) return normalizeDomainLabel(raw);
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
