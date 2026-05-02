import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../Plataforma.css';
import './Cuestionario.css';
import { ApiError } from '../../../services/api/httpClient';
import {
    createQuestionnaireSessionV2,
    getActiveQuestionnairesV2,
    getQuestionnaireHistoryV2,
    getQuestionnaireSessionPageV2,
    getQuestionnaireSessionV2,
    patchQuestionnaireSessionAnswersV2,
    submitQuestionnaireSessionV2
} from '../../../services/questionnaires/questionnaires.api';
import type {
    QuestionnaireOptionDTO,
    QuestionnaireQuestionV2DTO,
    QuestionnaireResponseType,
    QuestionnaireResponseValue,
    QuestionnaireHistoryItemV2DTO,
    QuestionnaireSessionV2DTO,
    QuestionnaireSubmitResponseV2DTO,
    QuestionnaireV2Mode,
    QuestionnaireV2Status
} from '../../../services/questionnaires/questionnaires.types';
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
const DEFAULT_INTEGER_MAX = 9999;
const DEFAULT_NUMBER_MIN = 0;
const DEFAULT_NUMBER_MAX = 9999;
const DEFAULT_NUMBER_STEP = 0.1;

type CompletionPhase = 'idle' | 'submitting' | 'processing' | 'processed' | 'failed';
type ProcessingStepState = 'pending' | 'active' | 'done' | 'error';

interface ProcessingStep {
    id: 'receive' | 'analyze' | 'generate';
    title: string;
    description: string;
    state: ProcessingStepState;
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

function normalizeAnswerDictionary(value: unknown): Record<string, QuestionnaireResponseValue> {
    if (!value) return {};

    if (Array.isArray(value)) {
        return value.reduce<Record<string, QuestionnaireResponseValue>>((acc, item) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) return acc;
            const answer = item as Record<string, unknown>;
            const questionId = toText(answer.question_id);
            if (!questionId) return acc;
            acc[questionId] =
                (answer.answer as QuestionnaireResponseValue) ??
                null;
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
    if (normalized === 'numeric' || normalized === 'float' || normalized === 'decimal') return 'number';
    return normalized;
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
    if (question.response_type === 'boolean') {
        return [{ value: true, label: 'Si' }, { value: false, label: 'No' }];
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
    const constraints = getNumericConstraints(question);
    const normalizedValue = value.replace(',', '.');
    const parsed = Number(normalizedValue);
    if (!Number.isFinite(parsed)) return null;
    if (parsed < constraints.min || parsed > constraints.max) return null;
    const isIntegerType = question.response_type === 'integer';
    if (isIntegerType) return Math.trunc(parsed);
    return parsed;
}

function getNumericConstraints(question: QuestionnaireQuestionV2DTO) {
    const isIntegerType = question.response_type === 'integer';

    const fallbackMin = isIntegerType ? DEFAULT_INTEGER_MIN : DEFAULT_NUMBER_MIN;
    const fallbackMax = isIntegerType ? DEFAULT_INTEGER_MAX : DEFAULT_NUMBER_MAX;
    const fallbackStep = isIntegerType ? 1 : DEFAULT_NUMBER_STEP;

    const min = typeof question.response_min === 'number' && Number.isFinite(question.response_min)
        ? question.response_min
        : fallbackMin;
    const maxCandidate = typeof question.response_max === 'number' && Number.isFinite(question.response_max)
        ? question.response_max
        : fallbackMax;
    const max = Math.max(maxCandidate, min);

    const step = typeof question.response_step === 'number' && Number.isFinite(question.response_step) && question.response_step > 0
        ? question.response_step
        : fallbackStep;

    return { min, max, step };
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
            return {
                ...record,
                id,
                text,
                code: toText(record.code),
                response_type: normalizeQuestionType(record.response_type),
                position: Number.isFinite(Number(record.position)) ? Number(record.position) : index + 1,
                response_min: Number.isFinite(Number(record.response_min)) ? Number(record.response_min) : null,
                response_max: Number.isFinite(Number(record.response_max)) ? Number(record.response_max) : null,
                response_step: Number.isFinite(Number(record.response_step)) ? Number(record.response_step) : null,
                response_options: Array.isArray(record.response_options)
                    ? (record.response_options as unknown[])
                    : null,
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
        toText(rawQuestion.item_id),
        toText(rawQuestion.questionnaire_item_id)
    ];

    const normalized: string[] = [];
    for (const candidate of candidates) {
        const key = typeof candidate === 'string' ? candidate.trim() : '';
        if (!key || normalized.includes(key)) continue;
        normalized.push(key);
    }
    return normalized;
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

    next[keys[0]] = value;
    for (let index = 1; index < keys.length; index += 1) {
        if (Object.hasOwn(next, keys[index])) {
            next[keys[index]] = value;
        }
    }
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
    const candidates = [
        rawQuestion.answer,
        rawQuestion.current_answer,
        rawQuestion.response,
        rawQuestion.response_value,
        rawQuestion.selected_value,
        rawQuestion.value
    ];

    for (const candidate of candidates) {
        if (candidate === null) return null;
        if (typeof candidate === 'string' || typeof candidate === 'number' || typeof candidate === 'boolean') {
            return candidate;
        }
    }

    return undefined;
}

function buildAnswersFromQuestions(questions: QuestionnaireQuestionV2DTO[]) {
    return questions.reduce<Record<string, QuestionnaireResponseValue>>((acc, question) => {
        const inferredAnswer = extractAnswerFromQuestionRecord(question);
        if (inferredAnswer !== undefined) {
            acc[question.id] = inferredAnswer;
        }
        return acc;
    }, {});
}

function mapError(error: unknown, fallback: string) {
    if (!(error instanceof ApiError)) return fallback;
    if (error.status === 400) return 'Revisa los datos e intenta nuevamente.';
    if (error.status === 401) return 'Sesion expirada o no autenticado.';
    if (error.status === 403) return 'No tienes permisos para esta operacion.';
    if (error.status === 404) return 'No se encontro informacion para este cuestionario.';
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
    if (step === 'create_session') return 'crear la sesion';
    if (step === 'load_questions') return 'cargar las preguntas';
    if (step === 'load_session_detail') return 'cargar el detalle de la sesion';
    return 'validar la estructura del cuestionario';
}

function mapStartSessionError(error: unknown, step: StartSessionStep) {
    if (error instanceof Error && error.message === 'missing_session_id') {
        return 'El backend respondio al crear la sesion, pero no devolvio un identificador usable (id/session_id).';
    }

    if (error instanceof Error && error.message === 'empty_questions') {
        return 'La sesion se creo, pero la API no devolvio preguntas en la primera carga de pagina (page=1, page_size=20).';
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
        return 'Estamos enviando tus respuestas y preparando la evaluacion para analisis.';
    }

    const normalized = (status ?? '').toLowerCase();
    if (normalized === 'draft' || normalized === 'in_progress') {
        return 'El motor esta validando consistencia y preparando el analisis clinico orientativo.';
    }
    if (normalized === 'submitted') {
        return 'La evaluacion esta en cola de procesamiento y generacion de resultado.';
    }
    if (normalized === 'processed') {
        return 'La evaluacion finalizo correctamente.';
    }
    if (normalized === 'failed') {
        return 'No se logro completar el procesamiento de la evaluacion.';
    }
    if (normalized === 'archived') {
        return 'La sesion fue archivada antes de completar el resultado.';
    }
    return 'Estamos consolidando la informacion para generar un resultado util.';
}

function buildProcessingSteps(phase: CompletionPhase, status: QuestionnaireV2Status | null | undefined): ProcessingStep[] {
    const normalized = (status ?? '').toLowerCase();
    const receiveState: ProcessingStepState =
        phase === 'submitting' ? 'active' : phase === 'processing' || phase === 'processed' ? 'done' : 'pending';
    let analyzeState: ProcessingStepState = 'pending';
    let generateState: ProcessingStepState = 'pending';

    if (phase === 'submitting') {
        analyzeState = 'pending';
        generateState = 'pending';
    } else if (phase === 'processing') {
        if (normalized === 'draft' || normalized === 'in_progress') {
            analyzeState = 'active';
            generateState = 'pending';
        } else if (normalized === 'submitted') {
            analyzeState = 'done';
            generateState = 'active';
        } else {
            analyzeState = 'active';
            generateState = 'pending';
        }
    } else if (phase === 'processed') {
        analyzeState = 'done';
        generateState = 'done';
    } else if (phase === 'failed') {
        analyzeState = normalized === 'failed' ? 'error' : 'done';
        generateState = 'error';
    }

    return [
        {
            id: 'receive',
            title: 'Recepcion de respuestas',
            description: 'Confirmamos y sellamos tus respuestas en la sesion activa.',
            state: receiveState
        },
        {
            id: 'analyze',
            title: 'Analisis de evaluacion',
            description: 'Corremos validaciones y consistencia del cuestionario.',
            state: analyzeState
        },
        {
            id: 'generate',
            title: 'Generacion de resultado',
            description: 'Consolidamos hallazgos para mostrar un resumen accionable.',
            state: generateState
        }
    ];
}

function formatPercent(value: number | null | undefined) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
    return `${Math.round(value * 100) / 100}%`;
}

function isValid(question: QuestionnaireQuestionV2DTO, value: unknown) {
    const required = isQuestionRequired(question);
    if (!required && (value === null || value === undefined || value === '')) {
        return true;
    }

    if (question.response_type === 'text') {
        if (typeof value !== 'string') return false;
        const trimmed = value.trim();
        if (!required && trimmed.length === 0) return true;
        const minLength = question.response_min != null ? Math.max(0, Math.trunc(question.response_min)) : 1;
        const maxLength = question.response_max != null ? Math.max(minLength, Math.trunc(question.response_max)) : null;
        if (trimmed.length < minLength) return false;
        if (maxLength != null && trimmed.length > maxLength) return false;
        return true;
    }

    if (question.response_type === 'integer' || question.response_type === 'number') {
        if (typeof value !== 'number' || !Number.isFinite(value)) return false;
        if (question.response_type === 'integer' && !Number.isInteger(value)) return false;
        const constraints = getNumericConstraints(question);
        if (value < constraints.min) return false;
        if (value > constraints.max) return false;
        return true;
    }

    if (question.response_type === 'boolean') {
        return typeof value === 'boolean';
    }

    const options = normalizeQuestionOptions(question);
    if (options.length > 0) {
        return options.some((option) => option.value === value);
    }

    return value !== null && value !== undefined && value !== '';
}

export default function Cuestionario() {
    const { primaryRole } = useAuth();
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
    const [completionPhase, setCompletionPhase] = useState<CompletionPhase>('idle');
    const [backendStatus, setBackendStatus] = useState<QuestionnaireV2Status | null>(null);
    const [completionPayload, setCompletionPayload] = useState<QuestionnaireSubmitResponseV2DTO | null>(null);
    const [completionError, setCompletionError] = useState<string | null>(null);
    const [sessionSnapshot, setSessionSnapshot] = useState<QuestionnaireSessionV2DTO | null>(null);
    const activeRef = useRef<HTMLDivElement | null>(null);
    const isMountedRef = useRef(true);
    const pollingTimerRef = useRef<number | null>(null);
    const pollingTokenRef = useRef(0);
    const pollingStartedAtRef = useRef<number | null>(null);
    const completionPayloadRef = useRef<QuestionnaireSubmitResponseV2DTO | null>(null);
    const processingPanelRef = useRef<HTMLDivElement | null>(null);

    const modeMeta = useMemo(
        () => MODE_OPTIONS.find((mode) => mode.value === selectedMode) ?? MODE_OPTIONS[2],
        [selectedMode]
    );

    useEffect(() => {
        completionPayloadRef.current = completionPayload;
    }, [completionPayload]);

    const stopPolling = useCallback(() => {
        if (pollingTimerRef.current !== null) {
            window.clearTimeout(pollingTimerRef.current);
            pollingTimerRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            stopPolling();
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
        const firstPage = await getQuestionnaireSessionPageV2(sessionIdToLoad, { page: 1, page_size: SESSION_PAGE_SIZE });
        const firstQuestions = normalizeQuestions(firstPage.items);
        const totalPages = Math.max(1, firstPage.pagination.pages ?? 1);

        if (totalPages <= 1) {
            return firstQuestions;
        }

        const remainingRequests = Array.from({ length: totalPages - 1 }, (_, index) =>
            getQuestionnaireSessionPageV2(sessionIdToLoad, { page: index + 2, page_size: SESSION_PAGE_SIZE })
        );
        const remainingResponses = await Promise.all(remainingRequests);
        const remainingQuestions = remainingResponses.flatMap((response) => normalizeQuestions(response.items));
        const merged = [...firstQuestions, ...remainingQuestions];
        const uniqueById = new Map<string, QuestionnaireQuestionV2DTO>();

        merged.forEach((question) => {
            if (!uniqueById.has(question.id)) {
                uniqueById.set(question.id, question);
            }
        });

        return Array.from(uniqueById.values()).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
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
                setCompletionError('La evaluacion sigue en proceso por mas tiempo del esperado. Puedes reintentar la consulta en unos minutos.');
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
                        setCompletionPhase('processed');
                        setCompletionError(null);
                    } else {
                        setCompletionPhase('failed');
                        if ((latestStatus ?? '').toLowerCase() === 'archived') {
                            setCompletionError('La sesion fue archivada antes de obtener un resultado final.');
                        } else {
                            setCompletionError('El procesamiento de la evaluacion finalizo con error.');
                        }
                    }
                    return;
                }

                pollingTimerRef.current = window.setTimeout(() => {
                    void poll();
                }, PROCESSING_POLL_INTERVAL_MS);
            } catch (requestError) {
                if (!isMountedRef.current || pollingTokenRef.current !== currentToken) return;
                setCompletionPhase('failed');
                setCompletionError(mapError(requestError, 'No se pudo consultar el estado del procesamiento.'));
                stopPolling();
            }
        };

        void poll();
    }, [stopPolling]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => void loadActive(), 0);
        return () => window.clearTimeout(timeoutId);
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

    const continueSession = useCallback(async (sessionIdToContinue: string) => {
        stopPolling();
        setWorking(true);
        setError(null);
        setCompletionPhase('idle');
        setCompletionPayload(null);
        setCompletionError(null);
        setBackendStatus(null);
        setSessionSnapshot(null);
        let failedStep: StartSessionStep = 'load_questions';
        try {
            const allQuestions = await loadAllSessionQuestions(sessionIdToContinue);
            failedStep = 'load_session_detail';
            const detail = await getQuestionnaireSessionV2(sessionIdToContinue);
            if (allQuestions.length === 0) throw new Error('empty_questions');
            failedStep = 'validate_questions';

            const detailAnswers = (detail as Record<string, unknown>).answers;
            const initialAnswers = {
                ...buildAnswersFromQuestions(allQuestions),
                ...normalizeAnswerDictionary(detailAnswers)
            };
            const nextQuestionIndex = allQuestions.findIndex((question) => !isValid(question, getAnswerForQuestion(initialAnswers, question)));

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
    }, [loadAllSessionQuestions, stopPolling]);

    const startSession = useCallback(async () => {
        stopPolling();
        setWorking(true);
        setError(null);
        setCompletionPhase('idle');
        setCompletionPayload(null);
        setCompletionError(null);
        setBackendStatus(null);
        setSessionSnapshot(null);
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

            const detailAnswers = (detail as Record<string, unknown>).answers;
            const initialAnswers = normalizeAnswerDictionary(detailAnswers);

            setSessionId(id);
            setQuestions(allQuestions);
            setAnswers(initialAnswers);
            setCurrentIndex(0);
            setSessionSnapshot(detail);
            setStarted(true);
            setReusableSession(null);
        } catch (requestError) {
            setError(mapStartSessionError(requestError, failedStep));
        } finally {
            setWorking(false);
        }
    }, [apiRole, loadAllSessionQuestions, selectedMode, stopPolling]);

    const currentQuestion = questions[currentIndex] ?? null;
    const currentAnswer = currentQuestion ? getAnswerForQuestion(answers, currentQuestion) : null;
    const currentOptions = currentQuestion ? normalizeQuestionOptions(currentQuestion) : [];
    const currentNumericConstraints =
        currentQuestion && (currentQuestion.response_type === 'integer' || currentQuestion.response_type === 'number')
            ? getNumericConstraints(currentQuestion)
            : null;
    const canContinue = currentQuestion ? isValid(currentQuestion, currentAnswer) : false;
    const progress = questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;

    const saveCurrent = async () => {
        if (!sessionId || !currentQuestion) return false;
        const value = getAnswerForQuestion(answers, currentQuestion);
        if (!isValid(currentQuestion, value)) return false;
        const questionId = getApiQuestionId(currentQuestion);
        if (!questionId) return false;

        await patchQuestionnaireSessionAnswersV2(sessionId, {
            answers: [{ question_id: questionId, answer: value ?? null }]
        });
        return true;
    };

    const handleNext = async () => {
        if (!currentQuestion || !canContinue) return;
        setWorking(true);
        setError(null);
        try {
            const saved = await saveCurrent();
            if (!saved) return;
            if (currentIndex < questions.length - 1) {
                setCurrentIndex((prev) => prev + 1);
            }
        } catch (requestError) {
            setError(mapError(requestError, 'No se pudo guardar la respuesta.'));
        } finally {
            setWorking(false);
        }
    };

    const handleFinish = async () => {
        if (!sessionId || !currentQuestion || !canContinue) return;
        setWorking(true);
        setError(null);
        setCompletionError(null);
        setCompletionPhase('submitting');
        try {
            const saved = await saveCurrent();
            if (!saved) {
                setCompletionPhase('idle');
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
                setCompletionError('La evaluacion no pudo procesarse correctamente. Puedes intentar consultar el estado de nuevo.');
                return;
            }

            if (normalizedStatus === 'processed' && hasRenderableResult(mergedPayload)) {
                setCompletionPhase('processed');
                return;
            }

            setCompletionPhase('processing');
            startStatusPolling(sessionId);
        } catch (requestError) {
            setCompletionPhase('failed');
            setCompletionError(mapError(requestError, 'No se pudo enviar el cuestionario.'));
        } finally {
            setWorking(false);
        }
    };

    const onAnswerChange = (value: QuestionnaireResponseValue) => {
        if (!currentQuestion) return;
        setAnswers((prev) => setAnswerForQuestion(prev, currentQuestion, value));
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
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
        setReusableSession(null);
        void loadActive();
    };

    const handleRetryProcessing = () => {
        if (!sessionId) return;
        setCompletionPhase('processing');
        setCompletionError(null);
        startStatusPolling(sessionId);
    };

    const processingSteps = useMemo(
        () => buildProcessingSteps(completionPhase, backendStatus),
        [backendStatus, completionPhase]
    );
    const processingMessage = useMemo(
        () => getProcessingMessage(completionPhase, backendStatus),
        [backendStatus, completionPhase]
    );
    const resultBlock = completionPayload?.result ?? null;
    const domains = completionPayload?.domains ?? [];
    const comorbidity = completionPayload?.comorbidity ?? [];
    const resultSessionId = completionPayload?.session_id ?? sessionSnapshot?.session_id ?? sessionId ?? '--';
    const resultQuestionnaireId = completionPayload?.questionnaire_id ?? sessionSnapshot?.questionnaire_id ?? '--';
    const reusableSessionId = getHistorySessionId(reusableSession);
    const reusableUpdatedAt =
        reusableSession?.updated_at ??
        reusableSession?.created_at ??
        null;
    const statusChipClass =
        completionPhase === 'processed'
            ? 'is-processed'
            : completionPhase === 'failed'
                ? 'is-failed'
                : 'is-processing';

    return (
        <div className="plataforma-view">
            <div className={`questionnaire-shell ${started ? '' : 'is-intro'}`}>
                {activeLoading ? (
                    <div className="questionnaire-state questionnaire-state-loading" role="status" aria-live="polite">
                        <div className="questionnaire-intro-loader" aria-hidden="true">
                            <span className="questionnaire-intro-loader-ring"></span>
                            <span className="questionnaire-intro-loader-ring delay"></span>
                            <span className="questionnaire-intro-loader-dot"></span>
                        </div>
                        <div className="questionnaire-intro-loader-copy">
                            <strong>Preparando cuestionario</strong>
                            <p>Estamos cargando la sesion y las preguntas iniciales.</p>
                        </div>
                    </div>
                ) : activeError ? (
                    <div className="questionnaire-state">
                        <p>{activeError}</p>
                        <button type="button" className="questionnaire-retry" onClick={() => void loadActive()}>
                            Reintentar
                        </button>
                    </div>
                ) : !started ? (
                    <div className="questionnaire-intro intro-animate">
                        <div className="questionnaire-intro-content">
                            <div className="questionnaire-intro-text">
                                <h1 className="questionnaire-title">
                                    Cuestionario de observacion
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
                            {reusableSession && reusableSessionId ? (
                                <div className="questionnaire-resume-panel" role="status" aria-live="polite">
                                    <div className="questionnaire-resume-copy">
                                        <strong>Tienes un cuestionario en progreso</strong>
                                        <p>
                                            Puedes retomar tu sesion guardada o iniciar una nueva.
                                            {reusableUpdatedAt ? ` Ultima actualizacion: ${new Date(reusableUpdatedAt).toLocaleString('es-CO')}.` : ''}
                                        </p>
                                    </div>
                                    <div className="questionnaire-resume-actions">
                                        <button
                                            type="button"
                                            className="questionnaire-btn primary questionnaire-start"
                                            onClick={() => void continueSession(reusableSessionId)}
                                            disabled={working}
                                        >
                                            {working ? 'Cargando...' : 'Continuar cuestionario'}
                                        </button>
                                        <button
                                            type="button"
                                            className="questionnaire-btn ghost"
                                            onClick={() => void startSession()}
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
                                    onClick={() => void startSession()}
                                    disabled={working}
                                >
                                    {working ? 'Iniciando...' : 'Comenzar'}
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
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
                            {completionPhase !== 'idle' ? (
                                <div
                                    className={`questionnaire-processing-panel ${completionPhase === 'processed' ? 'is-result' : ''} ${completionPhase === 'failed' ? 'is-error' : ''}`}
                                    aria-live="polite"
                                    ref={processingPanelRef}
                                    tabIndex={-1}
                                >
                                    <div className={`questionnaire-processing-chip ${statusChipClass}`}>
                                        {completionPhase === 'submitting' || completionPhase === 'processing'
                                            ? 'Procesando evaluacion'
                                            : completionPhase === 'processed'
                                                ? 'Resultado listo'
                                                : 'Procesamiento interrumpido'}
                                    </div>
                                    <h2 className="questionnaire-processing-title">
                                        {completionPhase === 'processed'
                                            ? 'Evaluacion completada'
                                            : completionPhase === 'failed'
                                                ? 'No pudimos completar la evaluacion'
                                                : 'Estamos analizando tus respuestas'}
                                    </h2>
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
                                            <strong>ID sesion</strong>
                                            <span>{resultSessionId}</span>
                                        </div>
                                        <div>
                                            <strong>ID cuestionario</strong>
                                            <span>{resultQuestionnaireId}</span>
                                        </div>
                                        <div>
                                            <strong>Progreso backend</strong>
                                            <span>{formatPercent(sessionSnapshot?.progress_pct)}</span>
                                        </div>
                                    </div>

                                    {completionPhase === 'processed' ? (
                                        <div className="questionnaire-result-view">
                                            <h3>Resultado principal</h3>
                                            {resultBlock ? (
                                                <div className="questionnaire-result-grid">
                                                    <div>
                                                        <strong>Resumen</strong>
                                                        <p>{toText(resultBlock.summary, 'Sin resumen disponible.')}</p>
                                                    </div>
                                                    <div>
                                                        <strong>Recomendacion operativa</strong>
                                                        <p>{toText(resultBlock.operational_recommendation, 'Sin recomendacion registrada.')}</p>
                                                    </div>
                                                    <div>
                                                        <strong>Calidad de completitud</strong>
                                                        <p>{formatPercent(resultBlock.completion_quality_score)}</p>
                                                    </div>
                                                    <div>
                                                        <strong>Nivel de datos faltantes</strong>
                                                        <p>{formatPercent(resultBlock.missingness_score)}</p>
                                                    </div>
                                                    <div>
                                                        <strong>Revision profesional</strong>
                                                        <p>
                                                            {typeof resultBlock.needs_professional_review === 'boolean'
                                                                ? resultBlock.needs_professional_review ? 'Si recomendada' : 'No requerida'
                                                                : '--'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="questionnaire-result-empty">
                                                    El estado llego a procesado, pero no hay resumen estructurado para mostrar.
                                                </p>
                                            )}

                                            {domains.length > 0 ? (
                                                <div className="questionnaire-result-section">
                                                    <h4>Dominios evaluados</h4>
                                                    <div className="questionnaire-result-list">
                                                        {domains.map((domain, index) => (
                                                            <article key={`${domain.domain ?? 'domain'}-${index}`} className="questionnaire-result-item">
                                                                <header>
                                                                    <strong>{toText(domain.domain, `Dominio ${index + 1}`)}</strong>
                                                                    <span className={`domain-alert is-${toText(domain.alert_level, 'unknown').toLowerCase()}`}>
                                                                        {toText(domain.alert_level, '--')}
                                                                    </span>
                                                                </header>
                                                                <p>{toText(domain.result_summary, 'Sin resumen operativo para este dominio.')}</p>
                                                                <div className="questionnaire-result-item-meta">
                                                                    <span>Probabilidad: {formatPercent(domain.probability)}</span>
                                                                    <span>Confianza: {formatPercent(domain.confidence_pct)}</span>
                                                                    <span>Banda: {toText(domain.confidence_band, '--')}</span>
                                                                </div>
                                                                <div className="questionnaire-result-item-meta">
                                                                    <span>Clase operativa: {toText(domain.operational_class, '--')}</span>
                                                                    <span>Caveat: {toText(domain.operational_caveat, '--')}</span>
                                                                </div>
                                                            </article>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : null}

                                            {comorbidity.length > 0 ? (
                                                <div className="questionnaire-result-section">
                                                    <h4>Comorbilidad</h4>
                                                    <div className="questionnaire-result-list">
                                                        {comorbidity.map((item, index) => (
                                                            <article key={`${item.coexistence_key ?? 'co'}-${index}`} className="questionnaire-result-item">
                                                                <header>
                                                                    <strong>{toText(item.coexistence_key, `Relacion ${index + 1}`)}</strong>
                                                                </header>
                                                                <p>{toText(item.summary, 'Sin resumen de coexistencia.')}</p>
                                                                <div className="questionnaire-result-item-meta">
                                                                    <span>Dominios: {Array.isArray(item.domains) && item.domains.length > 0 ? item.domains.join(', ') : '--'}</span>
                                                                    <span>Riesgo combinado: {formatPercent(item.combined_risk_score)}</span>
                                                                    <span>Nivel: {toText(item.coexistence_level, '--')}</span>
                                                                </div>
                                                            </article>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : null}

                                            <div className="questionnaire-result-actions">
                                                <button type="button" className="questionnaire-btn primary" onClick={handleSuccessClose}>
                                                    Finalizar
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}

                                    {completionPhase === 'failed' ? (
                                        <div className="questionnaire-processing-error">
                                            <p>{completionError ?? 'No fue posible completar el procesamiento de la evaluacion.'}</p>
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
                            ) : currentQuestion ? (
                                <div className="stack-active">
                                    <div className="stack-item is-active" ref={activeRef}>
                                        <h2 className="question-text">{currentQuestion.text}</h2>
                                        {currentQuestion.response_type === 'text' ? (
                                            <textarea
                                                className="question-textarea"
                                                rows={5}
                                                value={typeof currentAnswer === 'string' ? currentAnswer : ''}
                                                onChange={(event) => onAnswerChange(event.target.value)}
                                            />
                                        ) : currentQuestion.response_type === 'integer' || currentQuestion.response_type === 'number' ? (
                                            <>
                                                <input
                                                    type="number"
                                                    className="question-input"
                                                    value={typeof currentAnswer === 'number' ? currentAnswer : ''}
                                                    min={currentNumericConstraints?.min ?? undefined}
                                                    max={currentNumericConstraints?.max ?? undefined}
                                                    step={currentNumericConstraints?.step ?? undefined}
                                                    onChange={(event) => onAnswerChange(normalizeNumberInputValue(event.target.value, currentQuestion))}
                                                />
                                                {currentNumericConstraints ? (
                                                    <p className="question-input-hint">
                                                        Ingresa un valor entre {currentNumericConstraints.min} y {currentNumericConstraints.max}.
                                                    </p>
                                                ) : null}
                                            </>
                                        ) : currentOptions.length > 0 ? (
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
                                        ) : (
                                            <input
                                                type="text"
                                                className="question-input"
                                                value={typeof currentAnswer === 'string' ? currentAnswer : ''}
                                                onChange={(event) => onAnswerChange(event.target.value)}
                                            />
                                        )}

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
                                            onClick={handlePrevious}
                                            disabled={currentIndex <= 0 || working}
                                        >
                                            Anterior
                                        </button>
                                        {currentIndex === questions.length - 1 ? (
                                            <button
                                                type="button"
                                                className="questionnaire-btn primary"
                                                onClick={() => void handleFinish()}
                                                disabled={!canContinue || working}
                                            >
                                                {working ? 'Enviando...' : 'Enviar'}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className="questionnaire-btn primary"
                                                onClick={() => void handleNext()}
                                                disabled={!canContinue || working}
                                            >
                                                {working ? 'Guardando...' : 'Siguiente'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
