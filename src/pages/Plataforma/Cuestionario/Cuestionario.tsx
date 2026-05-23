import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../Plataforma.css';
import './Cuestionario.css';
import { ApiError } from '../../../services/api/httpClient';
import {
    createQuestionnaireSessionV2,
    getAllQuestionnaireSessionQuestionsV2,
    getActiveQuestionnairesV2,
    getQuestionnaireClinicalSummaryV2,
    getQuestionnaireHistoryV2,
    getQuestionnaireHistoryResultsV2,
    getQuestionnaireSessionV2,
    patchQuestionnaireSessionAnswersV2,
    submitQuestionnaireSessionV2
} from '../../../services/questionnaires/questionnaires.api';
import type {
    QuestionnaireClinicalDomainV2DTO,
    QuestionnaireClinicalSummaryV2DTO,
    QuestionnaireEvaluationComorbidityDTO,
    QuestionnaireEvaluationDomainDTO,
    QuestionnaireEvaluationResultDTO,
    QuestionnaireOptionDTO,
    QuestionnaireQuestionV2DTO,
    QuestionnaireResponseType,
    QuestionnaireResponseValue,
    QuestionnaireHistoryItemV2DTO,
    QuestionnaireRiskLevel,
    QuestionnaireSecureResultsV2DTO,
    QuestionnaireSessionV2DTO,
    QuestionnaireSubmitResponseV2DTO,
    QuestionnaireV2Mode,
    QuestionnaireV2Status
} from '../../../services/questionnaires/questionnaires.types';
import {
    buildClinicalSummarySections,
    getClinicalComorbiditySummary,
    getRiskLevelPresentation,
    getSafeClinicalDisclaimer,
    type ClinicalSummarySection,
    type RiskLevelPresentation
} from '../../../services/questionnaires/clinicalSummary';
import {
    formatDomainLabel,
    normalizeClinicalTextPresentation,
    sanitizeClinicalIndicatorText,
    sanitizeClinicalIndicatorsList
} from '../../../utils/presentation/clinicalReport';
import {
    formatDateTimeEsCO,
    getAlertLevelLabel,
    getConfidenceBandLabel,
    normalizeMojibakeText,
} from '../../../utils/presentation/naturalLanguage';
import questionnaireImage from '../../../assets/Imagenes/Cuestionario.svg';
import { useAuth } from '../../../hooks/auth/useAuth';

const DEFAULT_MODE: QuestionnaireV2Mode = 'complete';

const MODE_OPTIONS: Array<{ value: QuestionnaireV2Mode; label: string; hint: string; description: string }> = [
    { value: 'short', label: 'Version corta', hint: 'Mas rapida', description: 'Ideal cuando necesitas una guia inicial en poco tiempo.' },
    { value: 'medium', label: 'Version media', hint: 'Equilibrada', description: 'Combina un tiempo razonable con una lectura mas detallada.' },
    { value: 'complete', label: 'Version completa', hint: 'Mas robusta', description: 'Requiere mas dedicacion, pero entrega una valoracion mas solida del contexto.' }
];

const LIKERT = [
    { value: 1, label: 'Nunca' },
    { value: 2, label: 'Rara vez' },
    { value: 3, label: 'A veces' },
    { value: 4, label: 'Frecuentemente' },
    { value: 5, label: 'Casi siempre' }
];
const SESSION_PAGE_SIZE = 20;
const PROCESSING_POLL_INTERVAL_MS = 2500;
const PROCESSING_TIMEOUT_MS = 120000;
const DEFAULT_INTEGER_MIN = 0;
const DEFAULT_NUMBER_MIN = 0;
const DEFAULT_NUMBER_STEP = 0.1;

type CompletionPhase = 'idle' | 'submitting' | 'processing' | 'processed' | 'failed';
type ProcessingStepState = 'pending' | 'active' | 'done' | 'error';
type AnswerPersistenceState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
type PollTimer = ReturnType<typeof globalThis.setTimeout> | null;

function debugQuestionnaire(label: string, payload?: unknown) {
    if (!import.meta.env.DEV) return;
    if (payload === undefined) {
        console.debug(`[questionnaire] ${label}`);
        return;
    }
    console.debug(`[questionnaire] ${label}`, payload);
}

interface ProcessingStep {
    id: 'receive' | 'analyze' | 'generate';
    title: string;
    description: string;
    state: ProcessingStepState;
}

function swallowQuestionnaireAsyncError() {
    return undefined;
}

function runQuestionnaireTask(task: () => Promise<void>) {
    task().catch(swallowQuestionnaireAsyncError);
}

function scheduleQuestionnairePoll(
    timerRef: { current: PollTimer },
    task: () => Promise<void>,
    delay: number
) {
    timerRef.current = globalThis.setTimeout(() => {
        runQuestionnaireTask(task);
    }, delay);
}

function roleToApiRole(role: string | null) {
    return role === 'psicologo' ? 'psychologist' : 'guardian';
}

function getRolePresentationLabel(role: 'guardian' | 'psychologist') {
    return role === 'psychologist' ? 'Psicólogo' : 'Padre o tutor';
}

function getHistorySessionId(item: QuestionnaireHistoryItemV2DTO | null | undefined) {
    if (!item) return '';
    if (typeof item.session_id === 'string' && item.session_id.trim().length > 0) return item.session_id.trim();
    if (typeof item.questionnaire_session_id === 'string' && item.questionnaire_session_id.trim().length > 0) return item.questionnaire_session_id.trim();
    return item.id;
}

function parseDate(value: string | null | undefined) {
    if (!value) return 0;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : 0;
}

function pickReusableSession(
    items: QuestionnaireHistoryItemV2DTO[],
    mode: QuestionnaireV2Mode,
    apiRole: 'guardian' | 'psychologist'
) {
    const filtered = items.filter((item) => {
        const normalizedStatus = (item.status ?? '').toLowerCase();
        if (normalizedStatus !== 'draft' && normalizedStatus !== 'in_progress') return false;

        const itemMode = typeof item.mode === 'string' ? item.mode.toLowerCase() : '';
        if (itemMode && itemMode !== mode) return false;

        const itemRole = typeof item.role === 'string' ? item.role.toLowerCase() : '';
        if (itemRole && itemRole !== apiRole) return false;

        return getHistorySessionId(item).length > 0;
    });

    if (filtered.length === 0) return null;
    return [...filtered].sort((a, b) => {
        const bScore = parseDate(b.updated_at) || parseDate(b.created_at);
        const aScore = parseDate(a.updated_at) || parseDate(a.created_at);
        return bScore - aScore;
    })[0] ?? null;
}

function toText(value: unknown, fallback = '') {
    return typeof value === 'string' ? value : fallback;
}

function readOptionalText(...candidates: unknown[]) {
    for (const candidate of candidates) {
        if (typeof candidate !== 'string') continue;
        const normalized = normalizeMojibakeText(candidate).trim();
        if (normalized.length > 0) return normalized;
    }
    return null;
}

function pickFiniteNumber(candidates: unknown[]) {
    for (const candidate of candidates) {
        const parsed = Number(candidate);
        if (Number.isFinite(parsed)) return parsed;
    }
    return null;
}

function pickAnswerValue(record: Record<string, unknown>) {
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

function pickQuestionAnswerKeys(record: Record<string, unknown>) {
    return [
        record.question_id,
        record.questionId,
        record.id,
        record.item_id,
        record.questionnaire_item_id,
        record.question_code,
        record.code
    ]
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item, index, items) => item.length > 0 && items.indexOf(item) === index);
}

function normalizeAnswerDictionary(value: unknown): Record<string, QuestionnaireResponseValue> {
    if (!value) return {};

    if (Array.isArray(value)) {
        return value.reduce<Record<string, QuestionnaireResponseValue>>((acc, item) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) return acc;
            const answerRecord = item as Record<string, unknown>;
            const keys = pickQuestionAnswerKeys(answerRecord);
            const answerValue = pickAnswerValue(answerRecord);
            if (keys.length === 0 || answerValue === undefined) return acc;
            keys.forEach((key) => {
                acc[key] = answerValue;
            });
            return acc;
        }, {});
    }

    if (typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return Object.entries(record).reduce<Record<string, QuestionnaireResponseValue>>((acc, [key, itemValue]) => {
            acc[key] = itemValue as QuestionnaireResponseValue;
            return acc;
        }, {});
    }

    return {};
}

function normalizeQuestionType(value: unknown): QuestionnaireResponseType {
    const normalized = toText(value, 'text').trim().toLowerCase();
    if (normalized === 'count') return 'integer';
    if (normalized === 'text_context') return 'text';
    if (normalized === 'numeric' || normalized === 'float' || normalized === 'decimal') return 'number';
    return normalized;
}

function getQuestionStateKey(question: QuestionnaireQuestionV2DTO) {
    return getApiQuestionId(question) || question.id || question.code || '';
}

function cleanOptionLabel(rawLabel: string) {
    const trimmed = rawLabel.trim();
    if (!trimmed) return '';
    const withoutPrefix = trimmed.replace(/^\s*\d{1,3}\s*[-:=.)]\s*/u, '');
    return withoutPrefix.trim() || trimmed;
}

function normalizeOption(value: unknown): QuestionnaireOptionDTO | null {
    if (value === null || value === undefined) return null;

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return {
            value,
            label: cleanOptionLabel(String(value))
        };
    }

    if (typeof value !== 'object' || Array.isArray(value)) return null;

    const record = value as Record<string, unknown>;
    const rawValue = record.value ?? record.answer ?? record.id ?? record.code ?? null;
    if (
        rawValue !== null &&
        rawValue !== undefined &&
        typeof rawValue !== 'string' &&
        typeof rawValue !== 'number' &&
        typeof rawValue !== 'boolean'
    ) {
        return null;
    }

    const optionValue =
        typeof rawValue === 'string' || typeof rawValue === 'number' || typeof rawValue === 'boolean'
            ? rawValue
            : null;
    if (optionValue === null) return null;

    const label =
        toText(record.label) ||
        toText(record.text) ||
        toText(record.name) ||
        toText(record.title) ||
        String(optionValue);

    return {
        value: optionValue,
        label: cleanOptionLabel(label)
    };
}

function normalizeQuestionOptions(question: QuestionnaireQuestionV2DTO) {
    const fromContract = Array.isArray(question.response_options)
        ? question.response_options.map(normalizeOption).filter((item): item is QuestionnaireOptionDTO => Boolean(item))
        : [];

    if (fromContract.length > 0) return fromContract;

    if (question.response_type === 'likert') return LIKERT;
    if (question.response_type === 'likert_0_4') {
        return [
            { value: 0, label: 'Nunca' },
            { value: 1, label: 'Casi nunca' },
            { value: 2, label: 'A veces' },
            { value: 3, label: 'Frecuentemente' },
            { value: 4, label: 'Siempre' }
        ];
    }
    if (question.response_type === 'likert_1_5') return LIKERT;
    if (question.response_type === 'frequency_0_3') {
        return [
            { value: 0, label: 'Nunca' },
            { value: 1, label: 'Ocasionalmente' },
            { value: 2, label: 'Frecuentemente' },
            { value: 3, label: 'Muy frecuente' }
        ];
    }
    if (question.response_type === 'intensity_0_10') {
        return Array.from({ length: 11 }, (_, index) => ({
            value: index,
            label: String(index)
        }));
    }
    if (question.response_type === 'boolean') {
        return [{ value: true, label: 'Sí' }, { value: false, label: 'No' }];
    }

    return [];
}

function isQuestionRequired(question: QuestionnaireQuestionV2DTO) {
    const raw = question.required;
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'number') return raw > 0;
    return true;
}

function normalizeNumberInputValue(value: string, question: QuestionnaireQuestionV2DTO) {
    if (value.trim() === '') return null;
    if (getNumericValidationMessage(question, value) !== null) return null;
    const normalizedValue = value.replace(',', '.').trim();
    const parsed = Number(normalizedValue);
    if (!Number.isFinite(parsed)) return null;
    const constraints = getNumericConstraints(question);
    return constraints.isIntegerType ? Math.trunc(parsed) : parsed;
}

function getNumericConstraints(question: QuestionnaireQuestionV2DTO) {
    const isIntegerType = question.response_type === 'integer';
    const explicitMin = typeof question.response_min === 'number' && Number.isFinite(question.response_min)
        ? question.response_min
        : null;
    const explicitMax = typeof question.response_max === 'number' && Number.isFinite(question.response_max)
        ? question.response_max
        : null;
    const explicitStep = typeof question.response_step === 'number' && Number.isFinite(question.response_step) && question.response_step > 0
        ? question.response_step
        : null;

    return {
        min: explicitMin ?? (isIntegerType ? DEFAULT_INTEGER_MIN : DEFAULT_NUMBER_MIN),
        max: explicitMax,
        step: explicitStep ?? (isIntegerType ? 1 : DEFAULT_NUMBER_STEP),
        hasExplicitMin: explicitMin !== null,
        hasExplicitMax: explicitMax !== null,
        hasExplicitStep: explicitStep !== null,
        isIntegerType
    };
}

function getQuestionContext(question: QuestionnaireQuestionV2DTO) {
    const context = readOptionalText(
        question.help_text,
        question.context,
        question.description,
        question.guidance,
        question.hint,
        question.instructions,
        question.explanation
    );

    if (!context) return null;

    const normalizedQuestion = normalizeMojibakeText(question.text).trim().toLowerCase();
    if (context.toLowerCase() === normalizedQuestion) return null;
    return context;
}

function getNumericRangeHelp(question: QuestionnaireQuestionV2DTO) {
    if (question.response_type !== 'integer' && question.response_type !== 'number') return null;
    const min = typeof question.response_min === 'number' && Number.isFinite(question.response_min)
        ? question.response_min
        : null;
    const max = typeof question.response_max === 'number' && Number.isFinite(question.response_max)
        ? question.response_max
        : null;

    if (min !== null && max !== null) return `Ingresa un valor entre ${min} y ${max}.`;
    if (min !== null) return `Ingresa un valor igual o mayor que ${min}.`;
    if (max !== null) return `Ingresa un valor igual o menor que ${max}.`;
    return null;
}

function buildNumericInputHint(question: QuestionnaireQuestionV2DTO) {
    if (question.response_type === 'integer') {
        return 'Ingresa un número entero válido.';
    }
    return 'Ingresa un valor numérico válido.';
}

function getNumericValidationMessage(question: QuestionnaireQuestionV2DTO, value: string) {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const constraints = getNumericConstraints(question);
    const parsed = Number(trimmed.replace(',', '.'));
    if (!Number.isFinite(parsed)) return 'Ingresa un valor numérico válido.';
    if (constraints.isIntegerType && !Number.isInteger(parsed)) {
        return 'Ingresa un número entero válido.';
    }
    if (constraints.min !== null && constraints.max !== null && (parsed < constraints.min || parsed > constraints.max)) {
        return `El valor debe estar entre ${constraints.min} y ${constraints.max}.`;
    }
    if (constraints.min !== null && parsed < constraints.min) {
        return `El valor debe ser mayor o igual a ${constraints.min}.`;
    }
    if (constraints.max !== null && parsed > constraints.max) {
        return `El valor debe ser menor o igual a ${constraints.max}.`;
    }
    if (!constraints.isIntegerType && constraints.step > 0) {
        const base = constraints.min ?? 0;
        const quotient = (parsed - base) / constraints.step;
        if (Math.abs(quotient - Math.round(quotient)) > 1e-6) {
            return `El valor debe respetar incrementos de ${constraints.step}.`;
        }
    }
    return null;
}

function normalizeQuestions(raw: unknown): QuestionnaireQuestionV2DTO[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
        .map((item, index) => {
            const record = item as Record<string, unknown>;
            const id =
                toText(record.id) ||
                toText(record.question_id) ||
                toText(record.item_id) ||
                toText(record.questionnaire_item_id) ||
                toText(record.code);
            const text =
                toText(record.text) ||
                toText(record.prompt) ||
                toText(record.question_text) ||
                toText(record.question) ||
                toText(record.statement) ||
                toText(record.title) ||
                toText(record.label);
            const responseMin = pickFiniteNumber([
                record.response_min,
                record.min_value,
                record.min,
                record.minimum
            ]);
            const responseMax = pickFiniteNumber([
                record.response_max,
                record.max_value,
                record.max,
                record.maximum
            ]);
            const responseStep = pickFiniteNumber([
                record.response_step,
                record.step,
                record.increment
            ]);
            return {
                ...record,
                id,
                text,
                code: toText(record.code),
                response_type: normalizeQuestionType(record.response_type),
                position: Number.isFinite(Number(record.position)) ? Number(record.position) : index + 1,
                response_min: responseMin,
                response_max: responseMax,
                response_step: responseStep,
                response_options: Array.isArray(record.response_options)
                    ? (record.response_options as unknown[])
                    : null,
                help_text: readOptionalText(
                    record.help_text,
                    record.context,
                    record.description,
                    record.guidance,
                    record.hint,
                    record.instructions,
                    record.explanation
                ),
                context: readOptionalText(record.context, record.help_text),
                description: readOptionalText(record.description),
                guidance: readOptionalText(record.guidance),
                hint: readOptionalText(record.hint),
                instructions: readOptionalText(record.instructions),
                explanation: readOptionalText(record.explanation),
                section_title: readOptionalText(record.section_title, record.section),
                required: typeof record.required === 'boolean' ? record.required : undefined
            };
        })
        .filter((q) => q.id && q.text)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

function getQuestionKeyCandidates(question: QuestionnaireQuestionV2DTO) {
    const rawQuestion = question as Record<string, unknown>;
    const candidates = [
        question.id,
        question.code,
        toText(rawQuestion.question_id),
        toText(rawQuestion.question_code),
        toText(rawQuestion.item_id),
        toText(rawQuestion.questionnaire_item_id),
        toText(rawQuestion.session_item_id)
    ];

    const normalized: string[] = [];
    for (const candidate of candidates) {
        const key = typeof candidate === 'string' ? candidate.trim() : '';
        if (!key || normalized.includes(key)) continue;
        normalized.push(key);
    }
    return normalized;
}

function coerceAnswerForQuestion(question: QuestionnaireQuestionV2DTO, value: QuestionnaireResponseValue | undefined) {
    if (value === null || value === undefined) return null;

    const type = String(question.response_type).toLowerCase();
    if (type === 'boolean') {
        if (typeof value === 'boolean') return value;
        const text = String(value).trim().toLowerCase();
        if (['true', '1', 'si', 'sí', 'yes'].includes(text)) return true;
        if (['false', '0', 'no'].includes(text)) return false;
        return value;
    }

    if ([
        'integer',
        'number',
        'count',
        'likert',
        'likert_0_4',
        'likert_1_5',
        'frequency_0_3',
        'intensity_0_10'
    ].includes(type)) {
        const parsed = Number(String(value).replace(',', '.'));
        if (Number.isFinite(parsed)) {
            return type === 'number' ? parsed : Math.trunc(parsed);
        }
    }

    return value;
}

function extractSessionAnswers(detail: unknown): Record<string, QuestionnaireResponseValue> {
    if (!detail || typeof detail !== 'object' || Array.isArray(detail)) {
        return {};
    }

    const record = detail as Record<string, unknown>;
    return {
        ...normalizeAnswerDictionary(record.payload && typeof record.payload === 'object' ? (record.payload as Record<string, unknown>).answers : undefined),
        ...normalizeAnswerDictionary(record.result && typeof record.result === 'object' ? (record.result as Record<string, unknown>).answers : undefined),
        ...normalizeAnswerDictionary(record.data && typeof record.data === 'object' ? (record.data as Record<string, unknown>).answers : undefined),
        ...normalizeAnswerDictionary(record.session && typeof record.session === 'object' ? (record.session as Record<string, unknown>).answers : undefined),
        ...normalizeAnswerDictionary(record.answers)
    };
}

function getAnswerForQuestion(
    answers: Record<string, QuestionnaireResponseValue>,
    question: QuestionnaireQuestionV2DTO
): QuestionnaireResponseValue {
    const keys = getQuestionKeyCandidates(question);
    for (const key of keys) {
        if (Object.hasOwn(answers, key)) {
            return answers[key] ?? null;
        }
    }
    return null;
}

function setAnswerForQuestion(
    prevAnswers: Record<string, QuestionnaireResponseValue>,
    question: QuestionnaireQuestionV2DTO,
    value: QuestionnaireResponseValue
) {
    const next = { ...prevAnswers };
    const keys = getQuestionKeyCandidates(question);
    if (keys.length === 0) return next;

    keys.forEach((key) => {
        next[key] = value;
    });
    return next;
}

function getApiQuestionId(question: QuestionnaireQuestionV2DTO) {
    const rawQuestion = question as Record<string, unknown>;
    return (
        toText(rawQuestion.question_id) ||
        toText(rawQuestion.item_id) ||
        toText(rawQuestion.questionnaire_item_id) ||
        question.id
    );
}

function extractAnswerFromQuestionRecord(question: QuestionnaireQuestionV2DTO): QuestionnaireResponseValue | undefined {
    const rawQuestion = question as Record<string, unknown>;
    return pickAnswerValue(rawQuestion);
}

function buildAnswersFromQuestions(questions: QuestionnaireQuestionV2DTO[]) {
    return questions.reduce<Record<string, QuestionnaireResponseValue>>((acc, question) => {
        const inferredAnswer = coerceAnswerForQuestion(question, extractAnswerFromQuestionRecord(question));
        if (inferredAnswer !== undefined) {
            getQuestionKeyCandidates(question).forEach((key) => {
                acc[key] = inferredAnswer;
            });
        }
        return acc;
    }, {});
}

function mapError(error: unknown, fallback: string) {
    if (!(error instanceof ApiError)) return fallback;
    if (error.status === 400) return 'Revisa los datos e intenta nuevamente.';
    if (error.status === 401) return 'Sesion expirada o no autenticado.';
    if (error.status === 403) return 'No tienes permisos para esta operación.';
    if (error.status === 404) return 'No se encontró información para este cuestionario.';
    if (error.status >= 500) return 'Error del servidor. Intenta mas tarde.';
    return fallback;
}

function toApiErrorDetail(payload: unknown): string | null {
    if (!payload) return null;

    if (typeof payload === 'string' && payload.trim().length > 0) {
        return payload.trim();
    }

    if (typeof payload !== 'object' || Array.isArray(payload)) {
        return null;
    }

    const record = payload as Record<string, unknown>;
    const directCandidates = [record.detail, record.message, record.msg, record.error, record.code];
    for (const candidate of directCandidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            return candidate.trim();
        }
    }

    if (Array.isArray(record.errors)) {
        const firstError = record.errors.find((entry) => typeof entry === 'string' && entry.trim().length > 0);
        if (typeof firstError === 'string' && firstError.trim().length > 0) {
            return firstError.trim();
        }
    }

    return null;
}

type StartSessionStep =
    | 'create_session'
    | 'load_questions'
    | 'load_session_detail'
    | 'validate_questions';

function mapStartSessionStepLabel(step: StartSessionStep) {
    if (step === 'create_session') return 'crear la sesión';
    if (step === 'load_questions') return 'cargar las preguntas';
    if (step === 'load_session_detail') return 'cargar el detalle de la sesión';
    return 'validar la estructura del cuestionario';
}

function mapStartSessionError(error: unknown, step: StartSessionStep) {
    if (error instanceof Error && error.message === 'missing_session_id') {
        return 'El backend respondió al crear la sesión, pero no devolvió un identificador usable (id/session_id).';
    }

    if (error instanceof Error && error.message === 'empty_questions') {
        return 'La sesión se creó, pero la API no devolvió preguntas en la primera carga de página (page=1, page_size=20).';
    }

    if (error instanceof ApiError) {
        const stepLabel = mapStartSessionStepLabel(step);
        const base = `Fallo al ${stepLabel} (HTTP ${error.status}).`;
        const detail = toApiErrorDetail(error.payload);
        return detail ? `${base} Detalle API: ${detail}` : base;
    }

    if (error instanceof Error && error.message.trim().length > 0) {
        return `Fallo al ${mapStartSessionStepLabel(step)}. Detalle: ${error.message}`;
    }

    return `Fallo al ${mapStartSessionStepLabel(step)}.`;
}

function getBackendStatusLabel(status: QuestionnaireV2Status | null | undefined) {
    const normalized = (status ?? '').toLowerCase();
    if (normalized === 'draft') return 'Borrador';
    if (normalized === 'in_progress') return 'En progreso';
    if (normalized === 'submitted') return 'Enviado';
    if (normalized === 'processed') return 'Procesado';
    if (normalized === 'failed') return 'Fallido';
    if (normalized === 'archived') return 'Archivado';
    return status ?? '--';
}

function isTerminalStatus(status: QuestionnaireV2Status | null | undefined) {
    const normalized = (status ?? '').toLowerCase();
    return normalized === 'processed' || normalized === 'failed' || normalized === 'archived';
}

function hasText(value: unknown) {
    return typeof value === 'string' && value.trim().length > 0;
}

function hasRenderableResult(payload: QuestionnaireSubmitResponseV2DTO | null) {
    if (!payload) return false;
    const result = payload.result;
    const hasResultBlock =
        !!result &&
        (hasText(result.summary) ||
            hasText(result.operational_recommendation) ||
            typeof result.completion_quality_score === 'number' ||
            typeof result.missingness_score === 'number' ||
            typeof result.needs_professional_review === 'boolean');
    const hasDomains = Array.isArray(payload.domains) && payload.domains.length > 0;
    const hasComorbidity = Array.isArray(payload.comorbidity) && payload.comorbidity.length > 0;
    return hasResultBlock || hasDomains || hasComorbidity;
}

function mergeCompletionPayload(
    current: QuestionnaireSubmitResponseV2DTO | null,
    incoming: QuestionnaireSubmitResponseV2DTO | null
): QuestionnaireSubmitResponseV2DTO | null {
    if (!current && !incoming) return null;
    if (!current) return incoming;
    if (!incoming) return current;

    const nextResult = hasRenderableResult({ ...incoming, domains: [], comorbidity: [] })
        ? incoming.result
        : current.result;
    const nextDomains =
        Array.isArray(incoming.domains) && incoming.domains.length > 0
            ? incoming.domains
            : current.domains ?? [];
    const nextComorbidity =
        Array.isArray(incoming.comorbidity) && incoming.comorbidity.length > 0
            ? incoming.comorbidity
            : current.comorbidity ?? [];

    return {
        ...current,
        ...incoming,
        result: nextResult ?? null,
        domains: nextDomains,
        comorbidity: nextComorbidity,
        metadata: incoming.metadata ?? current.metadata ?? null
    };
}

function sessionToCompletionPayload(session: QuestionnaireSessionV2DTO): QuestionnaireSubmitResponseV2DTO {
    return {
        session_id: session.session_id ?? session.id,
        questionnaire_id: session.questionnaire_id,
        status: session.status,
        result: session.result ?? null,
        domains: session.domains ?? [],
        comorbidity: session.comorbidity ?? [],
        metadata: session.metadata ?? null
    };
}

function getProcessingMessage(phase: CompletionPhase, status: QuestionnaireV2Status | null | undefined) {
    if (phase === 'submitting') {
        return 'Estamos enviando tus respuestas y preparando la evaluación para análisis.';
    }

    const normalized = (status ?? '').toLowerCase();
    if (normalized === 'draft' || normalized === 'in_progress') {
        return 'El motor está validando consistencia y preparando el análisis clínico orientativo.';
    }
    if (normalized === 'submitted') {
        return 'La evaluación está en cola de procesamiento y generación de resultado.';
    }
    if (normalized === 'processed') {
        return 'La evaluación finalizó correctamente.';
    }
    if (normalized === 'failed') {
        return 'No se logró completar el procesamiento de la evaluación.';
    }
    if (normalized === 'archived') {
        return 'La sesión fue archivada antes de completar el resultado.';
    }
    return 'Estamos consolidando la información para generar un resultado útil.';
}

function resolveReceiveStepState(phase: CompletionPhase): ProcessingStepState {
    if (phase === 'submitting') return 'active';
    if (phase === 'processing' || phase === 'processed') return 'done';
    return 'pending';
}

function buildAnalyzeGenerateState(
    phase: CompletionPhase,
    normalizedStatus: string
): Readonly<{ analyze: ProcessingStepState; generate: ProcessingStepState }> {
    if (phase === 'submitting') {
        return { analyze: 'pending', generate: 'pending' };
    }

    if (phase === 'processing') {
        if (normalizedStatus === 'submitted') {
            return { analyze: 'done', generate: 'active' };
        }
        return { analyze: 'active', generate: 'pending' };
    }

    if (phase === 'processed') {
        return { analyze: 'done', generate: 'done' };
    }

    if (phase === 'failed') {
        return {
            analyze: normalizedStatus === 'failed' ? 'error' : 'done',
            generate: 'error'
        };
    }

    return { analyze: 'pending', generate: 'pending' };
}

function buildProcessingSteps(phase: CompletionPhase, status: QuestionnaireV2Status | null | undefined): ProcessingStep[] {
    const normalized = (status ?? '').toLowerCase();
    const receiveState = resolveReceiveStepState(phase);
    const { analyze, generate } = buildAnalyzeGenerateState(phase, normalized);

    return [
        {
            id: 'receive',
            title: 'Recepción de respuestas',
            description: 'Confirmamos y sellamos tus respuestas en la sesión activa.',
            state: receiveState
        },
        {
            id: 'analyze',
            title: 'Análisis de evaluación',
            description: 'Corremos validaciones y consistencia del cuestionario.',
            state: analyze
        },
        {
            id: 'generate',
            title: 'Generación de resultado',
            description: 'Consolidamos hallazgos para mostrar un resumen accionable.',
            state: generate
        }
    ];
}

function formatResultPercent(value: unknown) {
    const numeric =
        typeof value === 'number'
            ? value
            : typeof value === 'string' && value.trim().length > 0
                ? Number(value.replace(',', '.'))
                : Number.NaN;

    if (!Number.isFinite(numeric)) return '--';

    const normalizedPercent = numeric >= 0 && numeric <= 1 ? numeric * 100 : numeric;
    const rounded =
        Math.abs(normalizedPercent - Math.round(normalizedPercent)) < 0.05
            ? Math.round(normalizedPercent)
            : Number(normalizedPercent.toFixed(1));

    return `${new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: Number.isInteger(rounded) ? 0 : 1,
        maximumFractionDigits: 1
    }).format(rounded)} %`;
}

function getQuestionnaireReportNotice(error: unknown, target: 'results' | 'clinical-summary') {
    if (!(error instanceof ApiError)) {
        return target === 'clinical-summary'
            ? 'No fue posible generar el informe orientativo en este momento.'
            : 'No fue posible recuperar el resultado seguro del cuestionario.';
    }

    const payload = typeof error.payload === 'object' && error.payload && !Array.isArray(error.payload)
        ? error.payload as Record<string, unknown>
        : null;
    const errorCode = typeof payload?.error === 'string' ? payload.error.trim().toLowerCase() : '';

    if (errorCode === 'session_not_submitted' || errorCode === 'results_not_available') {
        return 'Debes completar y enviar el cuestionario antes de consultar el informe final.';
    }

    if (errorCode === 'clinical_summary_failed') {
        return 'No fue posible generar el informe orientativo en este momento.';
    }

    if (errorCode === 'insufficient_data') {
        return 'No hubo suficientes datos para generar el informe orientativo completo.';
    }

    if (errorCode === 'runtime_artifact_unavailable') {
        return 'El artefacto de resultados todavía no está disponible. Intenta nuevamente en unos minutos.';
    }

    if (
        errorCode === 'plaintext_not_allowed' ||
        errorCode === 'encrypted_payload_invalid' ||
        errorCode === 'encryption_required' ||
        errorCode === 'decryption_failed' ||
        errorCode === 'invalid_crypto_version' ||
        errorCode === 'transport_key_failed' ||
        errorCode === 'key_expired' ||
        errorCode === 'key_id_mismatch'
    ) {
        return 'No fue posible completar el intercambio seguro de datos con el backend. Intenta nuevamente.';
    }

    return target === 'clinical-summary'
        ? mapError(error, 'No fue posible generar el informe orientativo en este momento.')
        : mapError(error, 'No fue posible recuperar el resultado seguro del cuestionario.');
}

function getApiErrorPayloadRecord(error: unknown) {
    if (!(error instanceof ApiError) || !error.payload || typeof error.payload !== 'object' || Array.isArray(error.payload)) {
        return null;
    }
    return error.payload as Record<string, unknown>;
}

function getApiErrorCode(error: unknown) {
    const payload = getApiErrorPayloadRecord(error);
    return typeof payload?.error === 'string' ? payload.error.trim().toLowerCase() : '';
}

function getApiErrorMessageDetail(error: unknown) {
    const payload = getApiErrorPayloadRecord(error);
    return typeof payload?.detail === 'string'
        ? payload.detail.trim()
        : (typeof payload?.msg === 'string' ? payload.msg.trim() : '');
}

function resolveSubmitErrorState(error: unknown) {
    const status = error instanceof ApiError ? error.status : null;
    const code = getApiErrorCode(error);
    const detail = getApiErrorMessageDetail(error);

    if (status === 400 && code === 'empty_answers') {
        return {
            code,
            message: 'Debes responder al menos una pregunta antes de enviar.',
            retryMode: 'submit' as const
        };
    }

    if (status === 400 && code === 'validation_error') {
        return {
            code,
            message: detail || 'La información enviada no pasó la validación del backend.',
            retryMode: 'submit' as const
        };
    }

    if (
        status === 503 &&
        ['runtime_artifact_unavailable', 'runtime_assets_unavailable', 'db_unavailable'].includes(code)
    ) {
        return {
            code,
            message: code === 'runtime_artifact_unavailable'
                ? 'El motor de evaluación no está disponible en este momento. Tus respuestas quedaron guardadas, pero no fue posible generar el resultado. Intenta nuevamente más tarde.'
                : 'El servicio de evaluación no está disponible temporalmente.',
            retryMode: 'submit' as const
        };
    }

    return {
        code: code || null,
        message: mapError(error, 'No se pudo enviar el cuestionario.'),
        retryMode: 'submit' as const
    };
}

function getClinicalDomainCardKey(domain: QuestionnaireClinicalDomainV2DTO, index: number) {
    return `${toText(domain.domain, 'clinical-domain')}-${toText(domain.compatibility_level, 'level')}-${index}`;
}

function getEvaluationDomainCardKey(domain: QuestionnaireEvaluationDomainDTO, index: number) {
    return `${toText(domain.domain, 'domain')}-${toText(domain.alert_level, 'alert')}-${index}`;
}

function getEvaluationComorbiditySummary(items: QuestionnaireEvaluationComorbidityDTO[]) {
    const firstSummary = items.find((item) => hasText(item.summary))?.summary;
    if (hasText(firstSummary)) {
        return normalizeClinicalTextPresentation(firstSummary, '');
    }

    const domains = items
        .flatMap((item) => Array.isArray(item.domains) ? item.domains : [])
        .filter((domain): domain is string => typeof domain === 'string' && domain.trim().length > 0);

    if (domains.length > 0) {
        return `Se observan posibles señales compartidas entre ${domains.map((domain) => formatDomainLabel(domain)).join(', ')}.`;
    }

    return '';
}

function getQuestionnaireStatusChipLabel(phase: CompletionPhase) {
    if (phase === 'processed') return 'Resultado listo';
    if (phase === 'failed') return 'Procesamiento interrumpido';
    return 'Procesando evaluación';
}

function getQuestionnaireStatusTitle(phase: CompletionPhase) {
    if (phase === 'processed') return 'Evaluacion completada';
    if (phase === 'failed') return 'No pudimos completar la evaluación';
    return 'Estamos analizando tus respuestas';
}

function getProcessingChipClass(phase: CompletionPhase) {
    if (phase === 'processed') return 'is-processed';
    if (phase === 'failed') return 'is-failed';
    return 'is-processing';
}

function getSubmitActionLabel(working: boolean, isLastQuestion: boolean) {
    if (working) return isLastQuestion ? 'Guardando...' : 'Guardando...';
    return isLastQuestion ? 'Enviar' : 'Siguiente';
}

interface QuestionnaireProcessedViewProps {
    riskPresentation: RiskLevelPresentation;
    generatedAt: string;
    reportNotice: string | null;
    summarySections: ClinicalSummarySection[];
    clinicalDomains: QuestionnaireClinicalDomainV2DTO[];
    evaluationDomains: QuestionnaireEvaluationDomainDTO[];
    resultBlock: QuestionnaireEvaluationResultDTO | null;
    comorbiditySummary: string;
    disclaimer: string;
    onClose: () => void;
}

function QuestionnaireProcessedView({
    riskPresentation,
    generatedAt,
    reportNotice,
    summarySections,
    clinicalDomains,
    evaluationDomains,
    resultBlock,
    comorbiditySummary,
    disclaimer,
    onClose
}: Readonly<QuestionnaireProcessedViewProps>) {
    const showClinicalDomains = clinicalDomains.length > 0;
    const showEvaluationDomains = !showClinicalDomains && evaluationDomains.length > 0;
    const hasComplementaryMetrics =
        !!resultBlock &&
        (typeof resultBlock.completion_quality_score === 'number' ||
            typeof resultBlock.missingness_score === 'number' ||
            typeof resultBlock.needs_professional_review === 'boolean' ||
            hasText(resultBlock.summary) ||
            hasText(resultBlock.operational_recommendation));
    const normalizedRiskLabel = normalizeClinicalTextPresentation(riskPresentation.label, riskPresentation.label);
    const normalizedRiskHint = normalizeClinicalTextPresentation(riskPresentation.hint, riskPresentation.hint);
    const normalizedComorbiditySummary = normalizeClinicalTextPresentation(comorbiditySummary, comorbiditySummary);
    const normalizedDisclaimer = normalizeClinicalTextPresentation(disclaimer, disclaimer);

    return (
        <div className="questionnaire-result-view">
            <div className="questionnaire-report-banner">
                <div className={`questionnaire-risk-chip is-${riskPresentation.tone}`}>
                    <strong>Nivel de alerta</strong>
                    <span>{normalizedRiskLabel}</span>
                </div>
                <div className="questionnaire-report-banner-copy">
                    <h3>Informe final orientativo</h3>
                    <p>{normalizedRiskHint}</p>
                    {generatedAt === '--' ? null : (
                        <span className="questionnaire-report-generated-at">Generado: {generatedAt}</span>
                    )}
                </div>
            </div>

            {reportNotice ? (
                <output className="questionnaire-inline-notice" aria-live="polite">
                    {reportNotice}
                </output>
            ) : null}

            {normalizedComorbiditySummary ? (
                <div className="questionnaire-comorbidity-banner">
                    <strong>Posible coexistencia de señales</strong>
                    <p>{normalizedComorbiditySummary}</p>
                </div>
            ) : null}

            <div className="questionnaire-clinical-sections">
                {summarySections.map((section) => (
                    <article
                        key={section.key}
                        className={`questionnaire-report-section ${section.key === 'aclaracion_importante' ? 'is-disclaimer' : ''}`}
                    >
                        <h4>{normalizeClinicalTextPresentation(section.title, section.title)}</h4>
                        <p>{normalizeClinicalTextPresentation(section.content, section.content)}</p>
                    </article>
                ))}
            </div>

            {showClinicalDomains ? (
                <div className="questionnaire-result-section">
                    <h4>Compatibilidad por área evaluada</h4>
                    <div className="questionnaire-result-list">
                        {clinicalDomains.map((domain, index) => {
                            const compatibility = domain.compatibility_level ?? domain.risk_level ?? riskPresentation.key;
                            const presentation = getRiskLevelPresentation(compatibility as QuestionnaireRiskLevel);
                            const indicators = Array.isArray(domain.main_indicators)
                                ? sanitizeClinicalIndicatorsList(domain.main_indicators, domain.domain)
                                : ['No hay indicadores clínicos adicionales disponibles para mostrar.'];
                            return (
                                <article key={getClinicalDomainCardKey(domain, index)} className="questionnaire-result-item">
                                    <header>
                                        <strong>{formatDomainLabel(domain.domain ?? `Dominio ${index + 1}`)}</strong>
                                        <span className={`questionnaire-domain-chip is-${presentation.tone}`}>
                                            {normalizeClinicalTextPresentation(presentation.label, presentation.label)}
                                        </span>
                                    </header>
                                    <p>{indicators.join(' ')}</p>
                                    <div className="questionnaire-result-item-meta">
                                        <span>Probabilidad: {formatResultPercent(domain.probability)}</span>
                                        <span>Confianza: {formatResultPercent(domain.confidence_pct)}</span>
                                        <span>Banda: {normalizeClinicalTextPresentation(getConfidenceBandLabel(domain.confidence_band), '--')}</span>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            {showEvaluationDomains ? (
                <div className="questionnaire-result-section">
                    <h4>Hallazgos complementarios por dominio</h4>
                    <div className="questionnaire-result-list">
                        {evaluationDomains.map((domain, index) => (
                            <article key={getEvaluationDomainCardKey(domain, index)} className="questionnaire-result-item">
                                <header>
                                    <strong>{formatDomainLabel(domain.domain ?? `Dominio ${index + 1}`)}</strong>
                                    <span className="questionnaire-domain-chip is-neutral">
                                        {normalizeClinicalTextPresentation(getAlertLevelLabel(domain.alert_level), '--')}
                                    </span>
                                </header>
                                <p>{sanitizeClinicalIndicatorText(String(domain.result_summary ?? '')) ?? normalizeClinicalTextPresentation(domain.result_summary, 'Sin resumen operativo para esta área.')}</p>
                                <div className="questionnaire-result-item-meta">
                                    <span>Probabilidad: {formatResultPercent(domain.probability)}</span>
                                    <span>Confianza: {formatResultPercent(domain.confidence_pct)}</span>
                                    <span>Banda: {normalizeClinicalTextPresentation(getConfidenceBandLabel(domain.confidence_band), '--')}</span>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            ) : null}

            {hasComplementaryMetrics ? (
                <div className="questionnaire-result-section">
                    <h4>Datos complementarios del procesamiento</h4>
                    <div className="questionnaire-result-grid">
                        <div>
                            <strong>Resumen orientativo</strong>
                            <p>{normalizeClinicalTextPresentation(resultBlock?.summary, 'Sin resumen disponible.')}</p>
                        </div>
                        <div>
                            <strong>Recomendación operativa</strong>
                            <p>{normalizeClinicalTextPresentation(resultBlock?.operational_recommendation, 'Sin recomendación registrada.')}</p>
                        </div>
                        <div>
                            <strong>Calidad de completitud</strong>
                            <p>{formatResultPercent(resultBlock?.completion_quality_score)}</p>
                        </div>
                        <div>
                            <strong>Datos faltantes</strong>
                            <p>{formatResultPercent(resultBlock?.missingness_score)}</p>
                        </div>
                        <div>
                            <strong>Valoración profesional</strong>
                            <p>{getProfessionalReviewLabel(resultBlock?.needs_professional_review)}</p>
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="questionnaire-disclaimer-card">
                <strong>Aclaración importante</strong>
                <p>{normalizedDisclaimer}</p>
            </div>

            <div className="questionnaire-result-actions">
                <button type="button" className="questionnaire-btn primary" onClick={onClose}>
                    Finalizar
                </button>
            </div>
        </div>
    );
}

function isEmptyValue(value: unknown) {
    return value === null || value === undefined || value === '';
}

function resolveTextLengthRange(question: QuestionnaireQuestionV2DTO) {
    let minLength = 1;
    if (question.response_min !== null && question.response_min !== undefined) {
        minLength = Math.max(0, Math.trunc(question.response_min));
    }

    let maxLength: number | null = null;
    if (question.response_max !== null && question.response_max !== undefined) {
        maxLength = Math.max(minLength, Math.trunc(question.response_max));
    }

    return { minLength, maxLength };
}

function isValidTextAnswer(question: QuestionnaireQuestionV2DTO, value: unknown, required: boolean) {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (trimmed.length === 0) return !required;

    const { minLength, maxLength } = resolveTextLengthRange(question);
    if (trimmed.length < minLength) return false;
    if (maxLength != null && trimmed.length > maxLength) return false;
    return true;
}

function isValidNumericAnswer(question: QuestionnaireQuestionV2DTO, value: unknown) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return false;
    return getNumericValidationMessage(question, String(value)) === null;
}

function isValidOptionsAnswer(question: QuestionnaireQuestionV2DTO, value: unknown) {
    const options = normalizeQuestionOptions(question);
    if (options.length === 0) return !isEmptyValue(value);
    return options.some((option) => option.value === value);
}

function isValid(question: QuestionnaireQuestionV2DTO, value: unknown) {
    const required = isQuestionRequired(question);
    if (!required && isEmptyValue(value)) return true;

    if (question.response_type === 'text') {
        return isValidTextAnswer(question, value, required);
    }

    if (question.response_type === 'integer' || question.response_type === 'number') {
        return isValidNumericAnswer(question, value);
    }

    if (question.response_type === 'boolean') {
        return typeof value === 'boolean';
    }

    return isValidOptionsAnswer(question, value);
}

function getProfessionalReviewLabel(value: boolean | null | undefined) {
    if (typeof value !== 'boolean') return '--';
    return value ? 'Recomendada' : 'No requerida';
}

function findFirstInvalidQuestionIndex(
    questions: QuestionnaireQuestionV2DTO[],
    answers: Record<string, QuestionnaireResponseValue>
) {
    for (let index = 0; index < questions.length; index += 1) {
        const question = questions[index];
        if (!isValid(question, getAnswerForQuestion(answers, question))) {
            return index;
        }
    }
    return -1;
}

function findFirstLegacyPendingQuestionIndex(questions: QuestionnaireQuestionV2DTO[]) {
    const firstPending = questions.findIndex((question) => {
        const raw = question as Record<string, unknown>;
        return raw.answered !== true;
    });

    return firstPending >= 0 ? firstPending : (questions.length > 0 ? questions.length - 1 : 0);
}

type AnswerControlProps = Readonly<{
    currentQuestion: QuestionnaireQuestionV2DTO | null;
    currentAnswer: QuestionnaireResponseValue | null;
    currentOptions: QuestionnaireOptionDTO[];
    currentNumericConstraints: ReturnType<typeof getNumericConstraints> | null;
    currentNumericDraftValue: string;
    currentNumericHelperText: string | null;
    currentNumericValidationMessage: string | null;
    onAnswerChange: (value: QuestionnaireResponseValue) => void;
    onNumericInputChange: (value: string) => void;
}>;

function AnswerControl({
    currentQuestion,
    currentAnswer,
    currentOptions,
    currentNumericConstraints,
    currentNumericDraftValue,
    currentNumericHelperText,
    currentNumericValidationMessage,
    onAnswerChange,
    onNumericInputChange
}: AnswerControlProps) {
    if (!currentQuestion) return null;

    if (currentQuestion.response_type === 'text') {
        return (
            <textarea
                className="question-textarea"
                rows={5}
                value={typeof currentAnswer === 'string' ? currentAnswer : ''}
                onChange={(event) => onAnswerChange(event.target.value)}
            />
        );
    }

    if (currentQuestion.response_type === 'integer' || currentQuestion.response_type === 'number') {
        return (
            <>
                <input
                    type="number"
                    className="question-input"
                    inputMode={currentNumericConstraints?.isIntegerType ? 'numeric' : 'decimal'}
                    value={currentNumericDraftValue}
                    min={currentNumericConstraints?.min ?? undefined}
                    max={currentNumericConstraints?.hasExplicitMax ? currentNumericConstraints.max ?? undefined : undefined}
                    step={currentNumericConstraints?.step ?? undefined}
                    onChange={(event) => onNumericInputChange(event.target.value)}
                />
                {currentNumericHelperText ? (
                    <p className="question-input-hint">
                        {currentNumericHelperText}
                    </p>
                ) : null}
                {currentNumericValidationMessage ? (
                    <p className="question-input-error">{currentNumericValidationMessage}</p>
                ) : null}
            </>
        );
    }

    if (currentOptions.length > 0) {
        return (
            <div className="question-options">
                {currentOptions.map((option) => (
                    <button
                        key={String(option.value)}
                        type="button"
                        className={`answer-option ${currentAnswer === option.value ? 'is-selected' : ''}`}
                        onClick={() => onAnswerChange(option.value as QuestionnaireResponseValue)}
                    >
                        <span className="answer-indicator" aria-hidden="true"></span>
                        <span className="answer-label">{option.label}</span>
                    </button>
                ))}
            </div>
        );
    }

    return (
        <input
            type="text"
            className="question-input"
            value={typeof currentAnswer === 'string' ? currentAnswer : ''}
            onChange={(event) => onAnswerChange(event.target.value)}
        />
    );
}

function resolveShellState(activeLoading: boolean, activeError: string | null, started: boolean) {
    if (activeLoading) return 'loading';
    if (activeError) return 'error';
    if (!started) return 'intro';
    return 'workspace';
}

export default function Cuestionario() {
    const { primaryRole, verifySession } = useAuth();
    const apiRole = useMemo(() => roleToApiRole(primaryRole), [primaryRole]);

    const [selectedMode, setSelectedMode] = useState<QuestionnaireV2Mode>(DEFAULT_MODE);
    const [templateName, setTemplateName] = useState('Cuestionario de observacion');
    const [activeLoading, setActiveLoading] = useState(true);
    const [activeError, setActiveError] = useState<string | null>(null);
    const [reusableSession, setReusableSession] = useState<QuestionnaireHistoryItemV2DTO | null>(null);

    const [started, setStarted] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [questions, setQuestions] = useState<QuestionnaireQuestionV2DTO[]>([]);
    const [answers, setAnswers] = useState<Record<string, QuestionnaireResponseValue>>({});
    const [currentIndex, setCurrentIndex] = useState(0);
    const [working, setWorking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveState, setSaveState] = useState<AnswerPersistenceState>('idle');
    const [saveError, setSaveError] = useState<string | null>(null);
    const [questionTransitionDirection, setQuestionTransitionDirection] = useState<'from-next' | 'from-prev'>('from-next');
    const [numericDrafts, setNumericDrafts] = useState<Record<string, string>>({});
    const [isQuestionContextOpen, setIsQuestionContextOpen] = useState(false);
    const [completionPhase, setCompletionPhase] = useState<CompletionPhase>('idle');
    const [backendStatus, setBackendStatus] = useState<QuestionnaireV2Status | null>(null);
    const [completionPayload, setCompletionPayload] = useState<QuestionnaireSubmitResponseV2DTO | null>(null);
    const [completionError, setCompletionError] = useState<string | null>(null);
    const [sessionSnapshot, setSessionSnapshot] = useState<QuestionnaireSessionV2DTO | null>(null);
    const [secureResults, setSecureResults] = useState<QuestionnaireSecureResultsV2DTO | null>(null);
    const [clinicalSummary, setClinicalSummary] = useState<QuestionnaireClinicalSummaryV2DTO | null>(null);
    const [reportNotice, setReportNotice] = useState<string | null>(null);
    const activeRef = useRef<HTMLDivElement | null>(null);
    const questionContextRef = useRef<HTMLDivElement | null>(null);
    const isMountedRef = useRef(true);
    const pollingTimerRef = useRef<PollTimer>(null);
    const pollingTokenRef = useRef(0);
    const pollingStartedAtRef = useRef<number | null>(null);
    const completionPayloadRef = useRef<QuestionnaireSubmitResponseV2DTO | null>(null);
    const processingPanelRef = useRef<HTMLDivElement | null>(null);
    const answersRef = useRef<Record<string, QuestionnaireResponseValue>>({});
    const dirtyQuestionIdsRef = useRef<Set<string>>(new Set());
    const savePromiseRef = useRef<Promise<boolean> | null>(null);
    const autoSaveTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
    const actionLockRef = useRef(false);

    const modeMeta = useMemo(
        () => MODE_OPTIONS.find((mode) => mode.value === selectedMode) ?? MODE_OPTIONS[2],
        [selectedMode]
    );

    useEffect(() => {
        completionPayloadRef.current = completionPayload;
    }, [completionPayload]);

    useEffect(() => {
        answersRef.current = answers;
    }, [answers]);

    const stopPolling = useCallback(() => {
        if (pollingTimerRef.current !== null) {
            globalThis.clearTimeout(pollingTimerRef.current);
            pollingTimerRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            stopPolling();
            if (autoSaveTimerRef.current !== null) {
                globalThis.clearTimeout(autoSaveTimerRef.current);
                autoSaveTimerRef.current = null;
            }
        };
    }, [stopPolling]);

    const loadActive = useCallback(async () => {
        setActiveLoading(true);
        setActiveError(null);
        try {
            const response = await getActiveQuestionnairesV2({
                mode: selectedMode,
                role: apiRole
            });
            const first = response.items[0] as Record<string, unknown> | undefined;
            setTemplateName(toText(first?.name, 'Cuestionario de observacion'));

            try {
                const [inProgressResponse, draftResponse] = await Promise.all([
                    getQuestionnaireHistoryV2({ status: 'in_progress', page: 1, page_size: SESSION_PAGE_SIZE }),
                    getQuestionnaireHistoryV2({ status: 'draft', page: 1, page_size: SESSION_PAGE_SIZE })
                ]);
                const candidate = pickReusableSession(
                    [...(inProgressResponse.items ?? []), ...(draftResponse.items ?? [])],
                    selectedMode,
                    apiRole
                );
                setReusableSession(candidate);
            } catch {
                setReusableSession(null);
            }
        } catch (requestError) {
            setActiveError(mapError(requestError, 'No se pudo cargar el cuestionario activo.'));
        } finally {
            setActiveLoading(false);
        }
    }, [apiRole, selectedMode]);

    const loadAllSessionQuestions = useCallback(async (sessionIdToLoad: string) => {
        const rawQuestions = await getAllQuestionnaireSessionQuestionsV2(sessionIdToLoad, SESSION_PAGE_SIZE);
        const questions = normalizeQuestions(rawQuestions);
        debugQuestionnaire('continue:questions-loaded', { count: questions.length });
        return questions;
    }, []);

    const loadProcessedArtifacts = useCallback(async (sessionIdToLoad: string) => {
        const [resultsState, summaryState] = await Promise.allSettled([
            getQuestionnaireHistoryResultsV2(sessionIdToLoad),
            getQuestionnaireClinicalSummaryV2(sessionIdToLoad)
        ]);

        let nextNotice: string | null = null;

        if (resultsState.status === 'fulfilled') {
            setSecureResults(resultsState.value);
        } else {
            setSecureResults(null);
            nextNotice = getQuestionnaireReportNotice(resultsState.reason, 'results');
        }

        if (summaryState.status === 'fulfilled') {
            setClinicalSummary(summaryState.value);
        } else {
            setClinicalSummary(null);
            nextNotice = nextNotice ?? getQuestionnaireReportNotice(summaryState.reason, 'clinical-summary');
        }

        setReportNotice(nextNotice);
    }, []);

    const startStatusPolling = useCallback((sessionIdToPoll: string) => {
        stopPolling();
        pollingTokenRef.current += 1;
        const currentToken = pollingTokenRef.current;
        pollingStartedAtRef.current = Date.now();

        const poll = async () => {
            if (!isMountedRef.current || pollingTokenRef.current !== currentToken) return;

            const startedAt = pollingStartedAtRef.current ?? Date.now();
            if (Date.now() - startedAt >= PROCESSING_TIMEOUT_MS) {
                setCompletionPhase('failed');
                setCompletionError('La evaluación sigue en proceso por más tiempo del esperado. Puedes reintentar la consulta en unos minutos.');
                stopPolling();
                return;
            }

            try {
                const latestSession = await getQuestionnaireSessionV2(sessionIdToPoll);
                if (!isMountedRef.current || pollingTokenRef.current !== currentToken) return;

                setSessionSnapshot(latestSession);
                const latestStatus = latestSession.status ?? null;
                setBackendStatus(latestStatus);

                const sessionOutcome = sessionToCompletionPayload(latestSession);
                setCompletionPayload((prev) => mergeCompletionPayload(prev, sessionOutcome));

                if (isTerminalStatus(latestStatus)) {
                    stopPolling();
                    if ((latestStatus ?? '').toLowerCase() === 'processed') {
                        await loadProcessedArtifacts(sessionIdToPoll);
                        setCompletionPhase('processed');
                        setCompletionError(null);
                    } else {
                        setCompletionPhase('failed');
                        if ((latestStatus ?? '').toLowerCase() === 'archived') {
                            setCompletionError('La sesión fue archivada antes de obtener un resultado final.');
                        } else {
                            setCompletionError('El procesamiento de la evaluación finalizó con error.');
                        }
                    }
                    return;
                }

                scheduleQuestionnairePoll(pollingTimerRef, poll, PROCESSING_POLL_INTERVAL_MS);
            } catch (requestError) {
                if (!isMountedRef.current || pollingTokenRef.current !== currentToken) return;
                setCompletionPhase('failed');
                setCompletionError(mapError(requestError, 'No se pudo consultar el estado del procesamiento.'));
                stopPolling();
            }
        };

        runQuestionnaireTask(poll);
    }, [loadProcessedArtifacts, stopPolling]);

    useEffect(() => {
        const timeoutId = globalThis.setTimeout(() => {
            loadActive().catch(() => undefined);
        }, 0);
        return () => globalThis.clearTimeout(timeoutId);
    }, [loadActive]);

    useEffect(() => {
        if (!started || !activeRef.current) return;
        requestAnimationFrame(() => {
            activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }, [currentIndex, started]);

    useEffect(() => {
        if (completionPhase === 'idle') return;
        const rafId = requestAnimationFrame(() => {
            processingPanelRef.current?.focus();
        });
        return () => cancelAnimationFrame(rafId);
    }, [completionPhase]);

    const resetAnswerPersistence = useCallback(() => {
        dirtyQuestionIdsRef.current.clear();
        savePromiseRef.current = null;
        setSaveState('idle');
        setSaveError(null);
        setNumericDrafts({});
    }, []);

    const continueSession = useCallback(async (sessionIdToContinue: string) => {
        stopPolling();
        setWorking(true);
        setError(null);
        setCompletionPhase('idle');
        setCompletionPayload(null);
        setCompletionError(null);
        setBackendStatus(null);
        setSessionSnapshot(null);
        setSecureResults(null);
        setClinicalSummary(null);
        setReportNotice(null);
        resetAnswerPersistence();
        let failedStep: StartSessionStep = 'load_questions';
        try {
            const allQuestions = await loadAllSessionQuestions(sessionIdToContinue);
            failedStep = 'load_session_detail';
            const detail = await getQuestionnaireSessionV2(sessionIdToContinue);
            if (allQuestions.length === 0) throw new Error('empty_questions');
            failedStep = 'validate_questions';

            const pageAnswers = buildAnswersFromQuestions(allQuestions);
            const detailAnswers = extractSessionAnswers(detail);
            const progressPct = typeof detail.progress_pct === 'number'
                ? detail.progress_pct
                : (typeof detail.progress_percent === 'number' ? detail.progress_percent : null);
            const answeredCount = typeof detail.answered_count === 'number' ? detail.answered_count : null;
            debugQuestionnaire('continue:detail-loaded', {
                progress_pct: progressPct,
                answered_count: answeredCount,
                answersCount: Object.keys(detailAnswers).length
            });
            debugQuestionnaire('continue:answers-from-pages', { count: Object.keys(pageAnswers).length });
            debugQuestionnaire('continue:answers-from-detail', { count: Object.keys(detailAnswers).length });

            const initialAnswersRaw = {
                ...detailAnswers,
                ...pageAnswers
            };
            const initialAnswers = allQuestions.reduce<Record<string, QuestionnaireResponseValue>>((acc, question) => {
                const answer = getAnswerForQuestion(initialAnswersRaw, question);
                if (answer === null || answer === undefined) return acc;
                return setAnswerForQuestion(acc, question, coerceAnswerForQuestion(question, answer));
            }, {});
            debugQuestionnaire('continue:answers-hydrated', { count: Object.keys(initialAnswers).length });

            if (
                Object.keys(initialAnswers).length === 0 &&
                ((typeof progressPct === 'number' && progressPct > 0) || (typeof answeredCount === 'number' && answeredCount > 0))
            ) {
                setError('Encontramos una sesión en progreso, pero no fue posible recuperar las respuestas guardadas.');
                return;
            }

            const nextQuestionIndex = Object.keys(initialAnswers).length > 0
                ? findFirstInvalidQuestionIndex(allQuestions, initialAnswers)
                : findFirstLegacyPendingQuestionIndex(allQuestions);
            debugQuestionnaire('continue:first-pending-index', { index: nextQuestionIndex });

            setSessionId(sessionIdToContinue);
            setQuestions(allQuestions);
            setAnswers(initialAnswers);
            setCurrentIndex(nextQuestionIndex >= 0 ? nextQuestionIndex : Math.max(allQuestions.length - 1, 0));
            setSessionSnapshot(detail);
            setStarted(true);
            setReusableSession(null);
        } catch (requestError) {
            setError(mapStartSessionError(requestError, failedStep));
        } finally {
            setWorking(false);
        }
    }, [loadAllSessionQuestions, resetAnswerPersistence, stopPolling]);

    const startSession = useCallback(async () => {
        stopPolling();
        setWorking(true);
        setError(null);
        setCompletionPhase('idle');
        setCompletionPayload(null);
        setCompletionError(null);
        setBackendStatus(null);
        setSessionSnapshot(null);
        setSecureResults(null);
        setClinicalSummary(null);
        setReportNotice(null);
        resetAnswerPersistence();
        let failedStep: StartSessionStep = 'create_session';
        try {
            const created = await createQuestionnaireSessionV2({
                mode: selectedMode,
                role: apiRole
            });
            const createdRecord = created as Record<string, unknown>;
            const id = toText(createdRecord.id) || toText(createdRecord.session_id);
            if (!id) throw new Error('missing_session_id');

            failedStep = 'load_questions';
            const allQuestions = await loadAllSessionQuestions(id);
            failedStep = 'load_session_detail';
            const detail = await getQuestionnaireSessionV2(id);
            if (allQuestions.length === 0) throw new Error('empty_questions');
            failedStep = 'validate_questions';

            const pageAnswers = buildAnswersFromQuestions(allQuestions);
            const detailAnswers = extractSessionAnswers(detail);
            const initialAnswersRaw = {
                ...detailAnswers,
                ...pageAnswers
            };
            const initialAnswers = allQuestions.reduce<Record<string, QuestionnaireResponseValue>>((acc, question) => {
                const answer = getAnswerForQuestion(initialAnswersRaw, question);
                if (answer === null || answer === undefined) return acc;
                return setAnswerForQuestion(acc, question, coerceAnswerForQuestion(question, answer));
            }, {});

            setSessionId(id);
            setQuestions(allQuestions);
            setAnswers(initialAnswers);
            setCurrentIndex(Math.max(findFirstInvalidQuestionIndex(allQuestions, initialAnswers), 0));
            setSessionSnapshot(detail);
            setStarted(true);
            setReusableSession(null);
        } catch (requestError) {
            setError(mapStartSessionError(requestError, failedStep));
        } finally {
            setWorking(false);
        }
    }, [apiRole, loadAllSessionQuestions, resetAnswerPersistence, selectedMode, stopPolling]);

    const markQuestionDirty = useCallback((question: QuestionnaireQuestionV2DTO) => {
        const questionId = getApiQuestionId(question);
        if (!questionId) return;
        dirtyQuestionIdsRef.current.add(questionId);
        setSaveState('dirty');
        setSaveError(null);
    }, []);

    const cancelPendingAutoSave = useCallback(() => {
        if (autoSaveTimerRef.current !== null) {
            globalThis.clearTimeout(autoSaveTimerRef.current);
            autoSaveTimerRef.current = null;
        }
    }, []);

    const buildPendingAnswerPayload = useCallback(() => {
        if (dirtyQuestionIdsRef.current.size === 0) {
            return [];
        }

        return questions.reduce<Array<{ question_id: string; answer: QuestionnaireResponseValue }>>((acc, question) => {
            const questionId = getApiQuestionId(question);
            if (!questionId || !dirtyQuestionIdsRef.current.has(questionId)) {
                return acc;
            }

            acc.push({
                question_id: questionId,
                answer: getAnswerForQuestion(answersRef.current, question) ?? null
            });
            return acc;
        }, []);
    }, [questions]);

    const flushPendingAnswers = useCallback(async () => {
        if (!sessionId) return false;
        if (savePromiseRef.current) {
            return savePromiseRef.current;
        }

        const pendingAnswers = buildPendingAnswerPayload();
        if (pendingAnswers.length === 0) {
            return saveState !== 'error';
        }

        const saveTask = (async () => {
            setSaveState('saving');
            setSaveError(null);
            try {
                await patchQuestionnaireSessionAnswersV2(sessionId, {
                    answers: pendingAnswers,
                    include_answers: false
                });
                dirtyQuestionIdsRef.current.clear();
                setSaveState('saved');
                return true;
            } catch (requestError) {
                const nextSaveError = mapError(requestError, 'No se pudieron guardar las respuestas.');
                setSaveState('error');
                setSaveError(nextSaveError);
                return false;
            } finally {
                savePromiseRef.current = null;
            }
        })();

        savePromiseRef.current = saveTask;
        return saveTask;
    }, [buildPendingAnswerPayload, saveState, sessionId]);

    const saveCurrentAnswerBeforeNavigation = useCallback(async () => {
        cancelPendingAutoSave();

        const hasDraftChanges = dirtyQuestionIdsRef.current.size > 0 || saveState === 'dirty';
        if (!hasDraftChanges && !savePromiseRef.current && saveState !== 'saving') {
            return true;
        }

        return flushPendingAnswers();
    }, [cancelPendingAutoSave, flushPendingAnswers, saveState]);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (saveState !== 'dirty' && saveState !== 'saving') return;
            event.preventDefault();
            event.returnValue = '';
        };

        globalThis.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            globalThis.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [saveState]);

    const currentQuestion = questions[currentIndex] ?? null;
    const currentAnswer = currentQuestion ? getAnswerForQuestion(answers, currentQuestion) : null;
    const currentOptions = currentQuestion ? normalizeQuestionOptions(currentQuestion) : [];
    const currentNumericConstraints =
        currentQuestion && (currentQuestion.response_type === 'integer' || currentQuestion.response_type === 'number')
            ? getNumericConstraints(currentQuestion)
            : null;
    const currentQuestionKey = currentQuestion ? getQuestionStateKey(currentQuestion) : '';
    const hasCurrentNumericDraft = currentQuestionKey ? Object.prototype.hasOwnProperty.call(numericDrafts, currentQuestionKey) : false;
    const currentNumericDraftValue =
        currentNumericConstraints
            ? (hasCurrentNumericDraft
                ? numericDrafts[currentQuestionKey] ?? ''
                : (typeof currentAnswer === 'number' ? String(currentAnswer) : ''))
            : '';
    const currentNumericValidationMessage =
        currentQuestion && currentNumericConstraints
            ? getNumericValidationMessage(currentQuestion, currentNumericDraftValue)
            : null;
    const currentQuestionContext = currentQuestion ? getQuestionContext(currentQuestion) : null;
    const currentNumericRangeHelpRaw = currentQuestion ? getNumericRangeHelp(currentQuestion) : null;
    const currentNumericRangeHelp = currentQuestionContext ? null : currentNumericRangeHelpRaw;
    const currentNumericHelperText =
        currentQuestion && currentNumericConstraints
            ? (currentNumericRangeHelp ?? buildNumericInputHint(currentQuestion))
            : null;
    const canContinue = currentQuestion
        ? (currentNumericConstraints && currentNumericValidationMessage
            ? false
            : isValid(currentQuestion, currentAnswer))
        : false;
    const questionContextPopoverId = currentQuestionContext ? `question-context-popover-${currentIndex}` : undefined;

    useEffect(() => {
        setIsQuestionContextOpen(false);
    }, [currentQuestionKey]);

    useEffect(() => {
        if (!isQuestionContextOpen) return undefined;

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target;
            if (!(target instanceof Node)) return;
            if (questionContextRef.current?.contains(target)) return;
            setIsQuestionContextOpen(false);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsQuestionContextOpen(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isQuestionContextOpen]);

    useEffect(() => {
        if (!started || completionPhase !== 'idle' || saveState !== 'dirty' || Boolean(currentNumericValidationMessage)) {
            cancelPendingAutoSave();
            return undefined;
        }

        autoSaveTimerRef.current = globalThis.setTimeout(() => {
            void flushPendingAnswers().catch(() => false);
        }, 700);

        return () => {
            cancelPendingAutoSave();
        };
    }, [cancelPendingAutoSave, completionPhase, currentNumericValidationMessage, flushPendingAnswers, saveState, started]);
    const progress = questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;
    const hasSaveError = saveState === 'error';
    const hasRequiredAnswersPending = findFirstInvalidQuestionIndex(questions, answers) >= 0;
    const canSubmitQuestionnaire =
        Boolean(sessionId) &&
        Boolean(currentQuestion) &&
        canContinue &&
        !working &&
        !hasSaveError &&
        !hasRequiredAnswersPending &&
        completionPhase === 'idle';

    const handleNext = async () => {
        if (!currentQuestion || !canContinue || actionLockRef.current) return;
        const nextIndex = currentIndex + 1;
        if (nextIndex >= questions.length) return;
        actionLockRef.current = true;
        setWorking(true);
        setError(null);
        try {
            const saved = await saveCurrentAnswerBeforeNavigation();
            if (!saved) {
                setError('No se pudieron guardar las respuestas antes de avanzar.');
                return;
            }
            setQuestionTransitionDirection('from-next');
            setCurrentIndex(nextIndex);
        } catch (requestError) {
            setError(mapError(requestError, 'No se pudo guardar la respuesta.'));
        } finally {
            actionLockRef.current = false;
            setWorking(false);
        }
    };

    const handleFinish = async () => {
        if (!sessionId || !currentQuestion || !canContinue || actionLockRef.current) return;
        actionLockRef.current = true;
        setWorking(true);
        setError(null);
        setCompletionError(null);
        setReportNotice(null);
        try {
            const sessionActive = await verifySession({ silent: true, allowRefresh: true });
            if (!sessionActive) {
                setCompletionError('Tu sesión expiró. Inicia sesión nuevamente para enviar el cuestionario.');
                return;
            }

            const firstInvalidQuestion = findFirstInvalidQuestionIndex(questions, answersRef.current);
            if (firstInvalidQuestion >= 0) {
                setCurrentIndex(firstInvalidQuestion);
                setError('Completa las respuestas obligatorias antes de enviar el cuestionario.');
                return;
            }

            setCompletionPhase('submitting');
            const saved = await saveCurrentAnswerBeforeNavigation();
            if (!saved) {
                setCompletionPhase('idle');
                setCompletionError('No se pudieron guardar las respuestas antes de enviar el cuestionario.');
                return;
            }

            const submitPayload = await submitQuestionnaireSessionV2(sessionId);
            const mergedPayload = mergeCompletionPayload(
                null,
                mergeCompletionPayload(submitPayload, { session_id: submitPayload.session_id ?? sessionId })
            );
            setCompletionPayload(mergedPayload);
            const submittedStatus = submitPayload.status ?? null;
            setBackendStatus(submittedStatus);

            const normalizedStatus = (submittedStatus ?? '').toLowerCase();
            if (normalizedStatus === 'failed') {
                setCompletionPhase('failed');
                setCompletionError('La evaluación no pudo procesarse correctamente. Puedes intentar el envío nuevamente.');
                return;
            }

            if (normalizedStatus === 'processed') {
                await loadProcessedArtifacts(sessionId);
                setCompletionPhase('processed');
                return;
            }

            setCompletionPhase('processing');
            startStatusPolling(sessionId);
        } catch (requestError) {
            const submitError = resolveSubmitErrorState(requestError);
            debugQuestionnaire('submit:error', {
                status: requestError instanceof ApiError ? requestError.status : null,
                code: submitError.code
            });
            setCompletionPhase('failed');
            setCompletionError(submitError.message);
        } finally {
            actionLockRef.current = false;
            setWorking(false);
        }
    };

    const onAnswerChange = (value: QuestionnaireResponseValue) => {
        if (!currentQuestion) return;
        setError(null);
        setSaveError(null);
        const questionKey = getQuestionStateKey(currentQuestion);
        if (questionKey) {
            setNumericDrafts((prev) => {
                if (!Object.prototype.hasOwnProperty.call(prev, questionKey)) return prev;
                const next = { ...prev };
                delete next[questionKey];
                return next;
            });
        }
        markQuestionDirty(currentQuestion);
        setAnswers((prev) => setAnswerForQuestion(prev, currentQuestion, value));
    };

    const onNumericInputChange = (value: string) => {
        if (!currentQuestion) return;
        const questionKey = getQuestionStateKey(currentQuestion);
        if (!questionKey) return;

        setError(null);
        setSaveError(null);
        setNumericDrafts((prev) => ({ ...prev, [questionKey]: value }));

        if (value.trim() === '') {
            markQuestionDirty(currentQuestion);
            setAnswers((prev) => setAnswerForQuestion(prev, currentQuestion, null));
            return;
        }

        const nextValue = normalizeNumberInputValue(value, currentQuestion);
        if (nextValue === null) {
            return;
        }

        markQuestionDirty(currentQuestion);
        setAnswers((prev) => setAnswerForQuestion(prev, currentQuestion, nextValue));
    };

    const handlePrevious = async () => {
        if (currentIndex <= 0 || actionLockRef.current) return;
        const previousIndex = currentIndex - 1;
        actionLockRef.current = true;
        setWorking(true);
        setError(null);
        try {
            const saved = await saveCurrentAnswerBeforeNavigation();
            if (!saved) {
                setError('No se pudieron guardar las respuestas antes de volver.');
                return;
            }
            setQuestionTransitionDirection('from-prev');
            setCurrentIndex(previousIndex);
        } finally {
            actionLockRef.current = false;
            setWorking(false);
        }
    };

    const handleSuccessClose = () => {
        stopPolling();
        setStarted(false);
        setSessionId(null);
        setQuestions([]);
        setAnswers({});
        setCurrentIndex(0);
        setError(null);
        setCompletionPhase('idle');
        setBackendStatus(null);
        setCompletionPayload(null);
        setCompletionError(null);
        setSessionSnapshot(null);
        setSecureResults(null);
        setClinicalSummary(null);
        setReportNotice(null);
        setReusableSession(null);
        resetAnswerPersistence();
        loadActive().catch(() => undefined);
    };

    const handleRetryProcessing = async () => {
        if (!sessionId || actionLockRef.current) return;
        actionLockRef.current = true;
        setWorking(true);
        setCompletionError(null);
        setReportNotice(null);

        try {
            const submitPayload = await submitQuestionnaireSessionV2(sessionId, { force_reprocess: true });
            const mergedPayload = mergeCompletionPayload(
                completionPayloadRef.current,
                mergeCompletionPayload(submitPayload, { session_id: submitPayload.session_id ?? sessionId })
            );
            setCompletionPayload(mergedPayload);
            const submittedStatus = submitPayload.status ?? null;
            setBackendStatus(submittedStatus);

            if ((submittedStatus ?? '').toLowerCase() === 'processed') {
                await loadProcessedArtifacts(sessionId);
                setCompletionPhase('processed');
                return;
            }

            setCompletionPhase('processing');
            startStatusPolling(sessionId);
        } catch (requestError) {
            const submitError = resolveSubmitErrorState(requestError);
            debugQuestionnaire('submit:error', {
                status: requestError instanceof ApiError ? requestError.status : null,
                code: submitError.code
            });
            setCompletionPhase('failed');
            setCompletionError(submitError.message);
        } finally {
            actionLockRef.current = false;
            setWorking(false);
        }
    };

    const handlePrimaryActionClick = () => {
        const action = isLastQuestion ? handleFinish : handleNext;
        action().catch(() => undefined);
    };

    const processingSteps = useMemo(
        () => buildProcessingSteps(completionPhase, backendStatus),
        [backendStatus, completionPhase]
    );
    const processingMessage = useMemo(
        () => getProcessingMessage(completionPhase, backendStatus),
        [backendStatus, completionPhase]
    );
    const resultBlock = secureResults?.result ?? completionPayload?.result ?? sessionSnapshot?.result ?? null;
    const evaluationDomains = useMemo(
        () => secureResults?.domains ?? completionPayload?.domains ?? sessionSnapshot?.domains ?? [],
        [completionPayload?.domains, secureResults?.domains, sessionSnapshot?.domains]
    );
    const evaluationComorbidity = useMemo(
        () => secureResults?.comorbidity ?? completionPayload?.comorbidity ?? sessionSnapshot?.comorbidity ?? [],
        [completionPayload?.comorbidity, secureResults?.comorbidity, sessionSnapshot?.comorbidity]
    );
    const clinicalDomains = clinicalSummary?.domains ?? [];
    const summarySections = useMemo(
        () => buildClinicalSummarySections(clinicalSummary),
        [clinicalSummary]
    );
    const riskPresentation = useMemo(
        () => getRiskLevelPresentation(clinicalSummary?.overall_risk_level ?? null),
        [clinicalSummary?.overall_risk_level]
    );
    const clinicalDisclaimer = useMemo(
        () => getSafeClinicalDisclaimer(clinicalSummary),
        [clinicalSummary]
    );
    const comorbiditySummary = useMemo(
        () => getClinicalComorbiditySummary(clinicalSummary) || getEvaluationComorbiditySummary(evaluationComorbidity),
        [clinicalSummary, evaluationComorbidity]
    );
    useEffect(() => {
        if (completionPhase !== 'processed') return;
        debugQuestionnaire('result:normalization-applied', {
            clinicalDomains: clinicalDomains.length,
            evaluationDomains: evaluationDomains.length
        });
    }, [clinicalDomains.length, completionPhase, evaluationDomains.length]);
    const resultSessionId = secureResults?.session?.session_id ?? completionPayload?.session_id ?? sessionSnapshot?.session_id ?? sessionId ?? '--';
    const resultQuestionnaireId = secureResults?.session?.questionnaire_id ?? completionPayload?.questionnaire_id ?? sessionSnapshot?.questionnaire_id ?? '--';
    const reportGeneratedAt = formatDateTimeEsCO(clinicalSummary?.generated_at);
    const reusableSessionId = getHistorySessionId(reusableSession);
    const reusableUpdatedAt =
        reusableSession?.updated_at ??
        reusableSession?.created_at ??
        null;
    const statusChipClass = getProcessingChipClass(completionPhase);
    const isLastQuestion = currentIndex === questions.length - 1;
    const submitActionLabel = getSubmitActionLabel(working, isLastQuestion);

    const introActionContent =
        reusableSession && reusableSessionId ? (
            <div className="questionnaire-resume-panel" role="status" aria-live="polite">
                <div className="questionnaire-resume-copy">
                    <strong>Tienes un cuestionario en progreso</strong>
                    <p>
                        Puedes retomar tu sesión guardada o iniciar una nueva.
                        {reusableUpdatedAt ? ` Ultima actualizacion: ${new Date(reusableUpdatedAt).toLocaleString('es-CO')}.` : ''}
                    </p>
                </div>
                <div className="questionnaire-resume-actions">
                    <button
                        type="button"
                        className="questionnaire-btn primary questionnaire-start"
                        onClick={() => continueSession(reusableSessionId).catch(() => undefined)}
                        disabled={working}
                    >
                        {working ? 'Cargando...' : 'Continuar cuestionario'}
                    </button>
                    <button
                        type="button"
                        className="questionnaire-btn ghost"
                        onClick={() => startSession().catch(() => undefined)}
                        disabled={working}
                    >
                        Empezar de nuevo
                    </button>
                </div>
            </div>
        ) : (
            <button
                type="button"
                className="questionnaire-btn primary questionnaire-start"
                onClick={() => startSession().catch(() => undefined)}
                disabled={working}
            >
                {working ? 'Iniciando...' : 'Comenzar'}
            </button>
        );

    const processingContent = (
        <div
            className={`questionnaire-processing-panel ${completionPhase === 'processed' ? 'is-result' : ''} ${completionPhase === 'failed' ? 'is-error' : ''}`}
            aria-live="polite"
            ref={processingPanelRef}
            tabIndex={-1}
        >
            <div className={`questionnaire-processing-chip ${statusChipClass}`}>
                {getQuestionnaireStatusChipLabel(completionPhase)}
            </div>
            <h2 className="questionnaire-processing-title">{getQuestionnaireStatusTitle(completionPhase)}</h2>
            <p className="questionnaire-processing-description">{processingMessage}</p>

            {completionPhase === 'submitting' || completionPhase === 'processing' ? (
                <div className="questionnaire-processing-visual" aria-hidden="true">
                    <div className="processing-orb"></div>
                    <div className="processing-wave"></div>
                    <div className="processing-wave delay"></div>
                </div>
            ) : null}

            <div className="questionnaire-processing-steps">
                {processingSteps.map((step) => (
                    <div key={step.id} className={`processing-step is-${step.state}`}>
                        <div className="processing-step-indicator" aria-hidden="true"></div>
                        <div>
                            <strong>{step.title}</strong>
                            <p>{step.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="questionnaire-processing-meta">
                <div>
                    <strong>Estado backend</strong>
                    <span>{getBackendStatusLabel(backendStatus)}</span>
                </div>
                <div>
                    <strong>ID sesión</strong>
                    <span>{resultSessionId}</span>
                </div>
                <div>
                    <strong>ID cuestionario</strong>
                    <span>{resultQuestionnaireId}</span>
                </div>
                <div>
                    <strong>Progreso backend</strong>
                    <span>{formatResultPercent(sessionSnapshot?.progress_pct)}</span>
                </div>
            </div>

            {completionPhase === 'processed' ? (
                <QuestionnaireProcessedView
                    riskPresentation={riskPresentation}
                    generatedAt={reportGeneratedAt}
                    reportNotice={reportNotice}
                    summarySections={summarySections}
                    clinicalDomains={clinicalDomains}
                    evaluationDomains={evaluationDomains}
                    resultBlock={resultBlock}
                    comorbiditySummary={comorbiditySummary}
                    disclaimer={clinicalDisclaimer}
                    onClose={handleSuccessClose}
                />
            ) : null}

            {completionPhase === 'failed' ? (
                <div className="questionnaire-processing-error">
                    <p>{completionError ?? 'No fue posible completar el procesamiento de la evaluación.'}</p>
                    <div className="questionnaire-result-actions">
                        <button type="button" className="questionnaire-btn ghost" onClick={handleSuccessClose}>
                            Volver al inicio
                        </button>
                        {sessionId ? (
                            <button type="button" className="questionnaire-btn primary" onClick={handleRetryProcessing}>
                                Reintentar estado
                            </button>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </div>
    );

    const activeQuestionContent = currentQuestion ? (
        <div className="stack-active">
            <div
                key={currentQuestion.id || `${currentIndex}`}
                className={`stack-item is-active questionnaire-question-card ${questionTransitionDirection}`}
                ref={activeRef}
            >
                <div className="question-title-row" ref={questionContextRef}>
                    <h2 className="question-text">{currentQuestion.text}</h2>
                    {currentQuestionContext ? (
                        <div className="question-context-anchor">
                            <button
                                type="button"
                                className={`question-info-button ${isQuestionContextOpen ? 'is-open' : ''}`}
                                aria-label="Ver información de la pregunta"
                                aria-expanded={isQuestionContextOpen}
                                aria-controls={questionContextPopoverId}
                                onClick={() => setIsQuestionContextOpen((prev) => !prev)}
                            >
                                i
                            </button>
                            {isQuestionContextOpen ? (
                                <div
                                    id={questionContextPopoverId}
                                    className="question-context-popover"
                                    role="dialog"
                                    aria-label="Información de la pregunta"
                                >
                                    {currentQuestionContext}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
                <AnswerControl
                    currentQuestion={currentQuestion}
                    currentAnswer={currentAnswer}
                    currentOptions={currentOptions}
                    currentNumericConstraints={currentNumericConstraints}
                    currentNumericDraftValue={currentNumericDraftValue}
                    currentNumericHelperText={currentNumericHelperText}
                    currentNumericValidationMessage={currentNumericValidationMessage}
                    onAnswerChange={onAnswerChange}
                    onNumericInputChange={onNumericInputChange}
                />

                <div className={`questionnaire-save-state is-${saveState}`} aria-live="polite">
                    {saveState === 'dirty' ? 'Cambios pendientes por guardar.' : null}
                    {saveState === 'saving' ? 'Guardando respuestas...' : null}
                    {saveState === 'saved' ? 'Respuestas guardadas.' : null}
                    {saveState === 'error' ? (saveError ?? 'No se pudieron guardar las respuestas.') : null}
                </div>

                {error ? <div className="question-warning">{error}</div> : null}

                <div className="questionnaire-progress">
                    <span className="questionnaire-progress-text">
                        Pregunta {currentIndex + 1}/{questions.length}
                    </span>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="stack-controls">
                <button
                    type="button"
                    className="questionnaire-btn ghost"
                    onClick={() => {
                        handlePrevious().catch(swallowQuestionnaireAsyncError);
                    }}
                    disabled={currentIndex <= 0 || working}
                >
                    Anterior
                </button>
                <button
                    type="button"
                    className="questionnaire-btn primary"
                    onClick={handlePrimaryActionClick}
                    disabled={isLastQuestion ? !canSubmitQuestionnaire : (!canContinue || working || hasSaveError)}
                >
                    {submitActionLabel}
                </button>
            </div>
        </div>
    ) : null;

    const stackContent = completionPhase === 'idle' ? activeQuestionContent : processingContent;

    const loadingContent = (
        <div className="questionnaire-state questionnaire-state-loading" role="status" aria-live="polite">
            <div className="questionnaire-intro-loader" aria-hidden="true">
                <span className="questionnaire-intro-loader-ring"></span>
                <span className="questionnaire-intro-loader-ring delay"></span>
                <span className="questionnaire-intro-loader-dot"></span>
            </div>
            <div className="questionnaire-intro-loader-copy">
                <strong>Preparando cuestionario</strong>
                <p>Estamos cargando la sesión y las preguntas iniciales.</p>
            </div>
        </div>
    );

    const errorContent = (
        <div className="questionnaire-state">
            <p>{activeError}</p>
            <button type="button" className="questionnaire-retry" onClick={() => loadActive().catch(() => undefined)}>
                Reintentar
            </button>
        </div>
    );

    const introContent = (
        <div className="questionnaire-intro intro-animate">
            <div className="questionnaire-intro-content">
                <div className="questionnaire-intro-text">
                    <h1 className="questionnaire-title">
                        <span>Cuestionario de observacion</span>
                        <span className="questionnaire-title-accent" aria-hidden="true"></span>
                    </h1>
                    <p className="questionnaire-subtitle">
                        Responde segun lo observado en las ultimas 4 semanas.
                    </p>
                    <p className="questionnaire-intro-text-body">
                        Elige el formato que mejor se ajuste a tu tiempo disponible.
                    </p>

                    <div className="questionnaire-mode">
                        <h2 className="questionnaire-mode-title">Selecciona el tipo de cuestionario</h2>
                        <p className="questionnaire-mode-description">
                            Mientras mas amplio sea el cuestionario, mas consistente sera la lectura final del contexto.
                        </p>
                        <div className="questionnaire-mode-list" role="radiogroup" aria-label="Modo de cuestionario">
                            {MODE_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={`questionnaire-mode-option ${selectedMode === option.value ? 'is-selected' : ''}`}
                                    role="radio"
                                    aria-checked={selectedMode === option.value}
                                    onClick={() => setSelectedMode(option.value)}
                                >
                                    <span className="questionnaire-mode-option-title">{option.label}</span>
                                    <span className="questionnaire-mode-option-hint">{option.hint}</span>
                                    <span className="questionnaire-mode-option-text">{option.description}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="questionnaire-intro-image">
                    <img src={questionnaireImage} alt="Vista previa del cuestionario" />
                </div>
            </div>

            {error ? <div className="question-warning">{error}</div> : null}

            <div className="questionnaire-intro-actions">
                {introActionContent}
            </div>
        </div>
    );

    const workspaceContent = (
        <div className="questionnaire-workspace">
            <div className="questionnaire-top">
                <div className="questionnaire-heading">
                    <h1 className="questionnaire-title">{templateName}</h1>
                    <p className="questionnaire-subtitle">
                        {modeMeta.label}
                    </p>
                    <div className="questionnaire-role-chip">
                        Aplicado por: {getRolePresentationLabel(apiRole)}
                    </div>
                    <p className="questionnaire-disclaimer">
                        Este cuestionario no diagnostica, solo genera una alerta temprana.
                    </p>
                </div>
            </div>

            <div className="questionnaire-stack">
                {stackContent}
            </div>
        </div>
    );

    const shellState = resolveShellState(activeLoading, activeError, started);
    const shellContent = {
        loading: loadingContent,
        error: errorContent,
        intro: introContent,
        workspace: workspaceContent
    }[shellState];

    return (
        <div className="plataforma-view">
            <div className={`questionnaire-shell ${started ? '' : 'is-intro'}`}>
                {shellContent}
            </div>
        </div>
    );
}
