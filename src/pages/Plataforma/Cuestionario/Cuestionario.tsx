import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../Plataforma.css';
import './Cuestionario.css';
import { ApiError } from '../../../services/api/httpClient';
import {
    createQuestionnaireSessionV2,
    getActiveQuestionnairesV2,
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
    QuestionnaireV2Mode
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

function roleToApiRole(role: string | null) {
    return role === 'psicologo' ? 'psychologist' : 'caregiver';
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

function normalizeOption(value: unknown): QuestionnaireOptionDTO | null {
    if (value === null || value === undefined) return null;

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return {
            value,
            label: String(value)
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
        label
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
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    const isIntegerType = question.response_type === 'integer';
    if (isIntegerType) return Math.trunc(parsed);
    return parsed;
}

function normalizeQuestions(raw: unknown): QuestionnaireQuestionV2DTO[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
        .map((item, index) => {
            const record = item as Record<string, unknown>;
            return {
                id: toText(record.id),
                text: toText(record.text),
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
        if (question.response_min != null && value < question.response_min) return false;
        if (question.response_max != null && value > question.response_max) return false;
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

    const [started, setStarted] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [questions, setQuestions] = useState<QuestionnaireQuestionV2DTO[]>([]);
    const [answers, setAnswers] = useState<Record<string, QuestionnaireResponseValue>>({});
    const [currentIndex, setCurrentIndex] = useState(0);
    const [working, setWorking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const activeRef = useRef<HTMLDivElement | null>(null);

    const modeMeta = useMemo(
        () => MODE_OPTIONS.find((mode) => mode.value === selectedMode) ?? MODE_OPTIONS[2],
        [selectedMode]
    );

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

    const startSession = useCallback(async () => {
        setWorking(true);
        setError(null);
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
            setStarted(true);
        } catch (requestError) {
            setError(mapStartSessionError(requestError, failedStep));
        } finally {
            setWorking(false);
        }
    }, [apiRole, loadAllSessionQuestions, selectedMode]);

    const currentQuestion = questions[currentIndex] ?? null;
    const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;
    const currentOptions = currentQuestion ? normalizeQuestionOptions(currentQuestion) : [];
    const canContinue = currentQuestion ? isValid(currentQuestion, currentAnswer) : false;
    const progress = questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;

    const saveCurrent = async () => {
        if (!sessionId || !currentQuestion) return false;
        const value = answers[currentQuestion.id];
        if (!isValid(currentQuestion, value)) return false;

        await patchQuestionnaireSessionAnswersV2(sessionId, {
            answers: [{ question_id: currentQuestion.id, answer: value ?? null }]
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
        try {
            const saved = await saveCurrent();
            if (!saved) return;
            await submitQuestionnaireSessionV2(sessionId);
            setShowSuccess(true);
        } catch (requestError) {
            setError(mapError(requestError, 'No se pudo enviar el cuestionario.'));
        } finally {
            setWorking(false);
        }
    };

    const onAnswerChange = (value: QuestionnaireResponseValue) => {
        if (!currentQuestion) return;
        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
        }
    };

    const handleSuccessClose = () => {
        setShowSuccess(false);
        setStarted(false);
        setSessionId(null);
        setQuestions([]);
        setAnswers({});
        setCurrentIndex(0);
        setError(null);
        void loadActive();
    };

    return (
        <div className="plataforma-view">
            <div className={`questionnaire-shell ${started ? '' : 'is-intro'}`}>
                {activeLoading ? (
                    <div className="questionnaire-state">Cargando cuestionario...</div>
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
                            <button
                                type="button"
                                className="questionnaire-btn primary questionnaire-start"
                                onClick={() => void startSession()}
                                disabled={working}
                            >
                                {working ? 'Iniciando...' : 'Comenzar'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="questionnaire-workspace">
                        <div className="questionnaire-top">
                            <div className="questionnaire-heading">
                                <h1 className="questionnaire-title">{templateName}</h1>
                                <p className="questionnaire-subtitle">
                                    {modeMeta.label} - Rol {apiRole === 'psychologist' ? 'psicologo' : 'cuidador'}
                                </p>
                                <p className="questionnaire-disclaimer">
                                    Este cuestionario no diagnostica, solo genera una alerta temprana.
                                </p>
                            </div>
                        </div>

                        <div className="questionnaire-stack">
                            {currentQuestion ? (
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
                                            <input
                                                type="number"
                                                className="question-input"
                                                value={typeof currentAnswer === 'number' ? currentAnswer : ''}
                                                min={currentQuestion.response_min ?? undefined}
                                                max={currentQuestion.response_max ?? undefined}
                                                step={currentQuestion.response_step ?? (currentQuestion.response_type === 'integer' ? 1 : 'any')}
                                                onChange={(event) => onAnswerChange(normalizeNumberInputValue(event.target.value, currentQuestion))}
                                            />
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

            {showSuccess ? (
                <div className="questionnaire-modal">
                    <div className="questionnaire-modal-card">
                        <p>Cuestionario enviado correctamente.</p>
                        <button type="button" className="questionnaire-btn primary" onClick={handleSuccessClose}>
                            Entendido
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
