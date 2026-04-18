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
    QuestionnaireQuestionV2DTO,
    QuestionnaireResponseValue,
    QuestionnaireV2Mode,
    QuestionnaireV2Role
} from '../../../services/questionnaires/questionnaires.types';
import questionnaireImage from '../../../assets/Imagenes/Cuestionario.svg';
import { useAuth } from '../../../hooks/auth/useAuth';

const DEFAULT_MODE: QuestionnaireV2Mode = 'short';
const SESSION_PAGE_SIZE = 200;
const MIN_TEXT_LENGTH = 3;

const likertOptions = [
    { value: 1, label: 'Nunca' },
    { value: 2, label: 'Rara vez' },
    { value: 3, label: 'A veces' },
    { value: 4, label: 'Frecuentemente' },
    { value: 5, label: 'Casi siempre' }
];

interface ActiveTemplateState {
    id: string;
    name: string;
    version: string;
    description: string;
}

function mapRoleToQuestionnaireRole(primaryRole: string | null): QuestionnaireV2Role {
    if (primaryRole === 'psicologo') return 'psychologist';
    return 'caregiver';
}

function toStringSafe(value: unknown, fallback = '') {
    return typeof value === 'string' ? value : fallback;
}

function toNumberOrNull(value: unknown) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return numeric;
}

function normalizeQuestion(value: unknown, index: number): QuestionnaireQuestionV2DTO | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const id = toStringSafe(record.id);
    const text = toStringSafe(record.text);
    if (!id || !text) return null;

    const responseType = toStringSafe(record.response_type, 'text');
    const rawOptions = Array.isArray(record.response_options) ? record.response_options : null;

    return {
        id,
        code: toStringSafe(record.code),
        text,
        response_type: responseType,
        position: Number.isFinite(Number(record.position)) ? Number(record.position) : index + 1,
        response_min: toNumberOrNull(record.response_min),
        response_max: toNumberOrNull(record.response_max),
        response_step: toNumberOrNull(record.response_step),
        response_options: rawOptions as Array<number | string> | null
    };
}

function normalizeQuestions(values: unknown[]): QuestionnaireQuestionV2DTO[] {
    return values
        .map((value, index) => normalizeQuestion(value, index))
        .filter((value): value is QuestionnaireQuestionV2DTO => Boolean(value))
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

function normalizeActiveTemplate(payload: unknown): ActiveTemplateState | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    const record = payload as Record<string, unknown>;
    const id = toStringSafe(record.id);
    if (!id) return null;
    return {
        id,
        name: toStringSafe(record.name, 'Cuestionario de observación'),
        version: toStringSafe(record.version, DEFAULT_MODE),
        description: toStringSafe(record.description, '')
    };
}

function extractSessionId(payload: unknown) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    const record = payload as Record<string, unknown>;
    const idCandidates = [record.id, record.session_id];
    for (const candidate of idCandidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate;
    }
    return null;
}

function normalizeSessionAnswers(payload: unknown) {
    const answerMap: Record<string, QuestionnaireResponseValue> = {};
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return answerMap;

    const record = payload as Record<string, unknown>;
    const answersField = record.answers;
    if (Array.isArray(answersField)) {
        answersField.forEach((entry) => {
            if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
            const answerRecord = entry as Record<string, unknown>;
            const questionId = toStringSafe(answerRecord.question_id);
            if (!questionId) return;
            const value = answerRecord.value as QuestionnaireResponseValue;
            answerMap[questionId] = value;
        });
        return answerMap;
    }

    if (answersField && typeof answersField === 'object' && !Array.isArray(answersField)) {
        const answersRecord = answersField as Record<string, unknown>;
        Object.entries(answersRecord).forEach(([questionId, value]) => {
            answerMap[questionId] = value as QuestionnaireResponseValue;
        });
    }

    return answerMap;
}

function isValidAnswer(question: QuestionnaireQuestionV2DTO, value: unknown) {
    switch (question.response_type) {
        case 'likert':
        case 'boolean':
            return value !== null && value !== undefined && value !== '';
        case 'integer': {
            if (typeof value !== 'number' || Number.isNaN(value) || !Number.isInteger(value)) return false;
            const minValue = Math.max(0, question.response_min ?? 0);
            if (value < minValue) return false;
            if (question.response_max !== null && question.response_max !== undefined && value > question.response_max) return false;
            return true;
        }
        case 'text':
        default:
            return typeof value === 'string' && value.trim().length >= MIN_TEXT_LENGTH;
    }
}

function formatAnswer(question: QuestionnaireQuestionV2DTO, value: unknown) {
    if (value === null || value === undefined || value === '') return '';
    switch (question.response_type) {
        case 'boolean':
            return value === true ? 'Sí' : value === false ? 'No' : String(value);
        case 'likert': {
            const options = Array.isArray(question.response_options) && question.response_options.length > 0
                ? question.response_options.map((option) => ({ value: option, label: String(option) }))
                : likertOptions;
            const match = options.find((option) => option.value === value);
            return match ? match.label : String(value);
        }
        case 'integer':
            return String(value);
        case 'text':
        default: {
            if (typeof value !== 'string') return String(value);
            const trimmed = value.trim();
            return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
        }
    }
}

function renderQuestionInput(
    question: QuestionnaireQuestionV2DTO,
    value: unknown,
    onChange: (newValue: unknown) => void
) {
    switch (question.response_type) {
        case 'likert': {
            const options = Array.isArray(question.response_options) && question.response_options.length > 0
                ? question.response_options.map((option) => ({ value: option, label: String(option) }))
                : likertOptions;
            return (
                <div className="question-options">
                    {options.map((option) => (
                        <button
                            key={String(option.value)}
                            type="button"
                            className={`answer-option ${value === option.value ? 'is-selected' : ''}`}
                            onClick={() => onChange(option.value)}
                        >
                            <span className="answer-indicator" aria-hidden="true"></span>
                            <span className="answer-label">{option.label}</span>
                        </button>
                    ))}
                </div>
            );
        }
        case 'boolean':
            return (
                <div className="question-options">
                    {[{ label: 'Sí', value: true }, { label: 'No', value: false }].map((option) => (
                        <button
                            key={option.label}
                            type="button"
                            className={`answer-option ${value === option.value ? 'is-selected' : ''}`}
                            onClick={() => onChange(option.value)}
                        >
                            <span className="answer-indicator" aria-hidden="true"></span>
                            <span className="answer-label">{option.label}</span>
                        </button>
                    ))}
                </div>
            );
        case 'integer': {
            const min = Math.max(0, question.response_min ?? 0);
            const max = question.response_max ?? undefined;
            const step = question.response_step ?? 1;
            return (
                <div className="question-input-block">
                    <label className="question-input-label">Ingresa un número</label>
                    <input
                        type="number"
                        className="question-input"
                        placeholder="0"
                        value={typeof value === 'number' ? value : ''}
                        onChange={(event) => {
                            const raw = event.target.value;
                            if (raw.startsWith('-')) return;
                            const nextValue = raw === '' ? '' : Number(raw);
                            if (nextValue !== '' && Number.isNaN(nextValue)) return;
                            onChange(nextValue === '' ? null : nextValue);
                        }}
                        min={min}
                        max={max}
                        step={step}
                        inputMode="numeric"
                        pattern="[0-9]*"
                    />
                    <span className="question-input-hint">Solo números (0 o mayor).</span>
                </div>
            );
        }
        case 'text':
        default:
            return (
                <div className="question-input-block">
                    <label className="question-input-label">Respuesta</label>
                    <textarea
                        className="question-textarea"
                        rows={5}
                        placeholder="Escribe una respuesta breve"
                        value={typeof value === 'string' ? value : ''}
                        onChange={(event) => onChange(event.target.value)}
                    />
                    <span className="question-input-note">
                        Estas respuestas no afectan el resultado final de forma aislada; ayudan a la interpretación profesional.
                    </span>
                </div>
            );
    }
}

function mapApiErrorToText(error: unknown, fallback = 'No fue posible completar la acción.') {
    if (!(error instanceof ApiError)) return fallback;
    if (error.status === 400) return 'No se pudieron guardar las respuestas. Revisa los datos.';
    if (error.status === 401) return 'Sesión expirada o no autenticado. Inicia sesión nuevamente.';
    if (error.status === 403) return 'No tienes permisos para esta operación.';
    if (error.status === 404) return 'La sesión de cuestionario no está disponible.';
    if (error.status >= 500) return 'Error del servidor. Intenta nuevamente.';
    return fallback;
}

export default function Cuestionario() {
    const { primaryRole } = useAuth();
    const questionnaireRole = useMemo(() => mapRoleToQuestionnaireRole(primaryRole), [primaryRole]);

    const [activeTemplate, setActiveTemplate] = useState<ActiveTemplateState | null>(null);
    const [activeLoading, setActiveLoading] = useState(true);
    const [activeError, setActiveError] = useState<string | null>(null);
    const [activeStatusCode, setActiveStatusCode] = useState<number | null>(null);

    const [sessionId, setSessionId] = useState<string | null>(null);
    const [questions, setQuestions] = useState<QuestionnaireQuestionV2DTO[]>([]);
    const [answers, setAnswers] = useState<Record<string, QuestionnaireResponseValue>>({});

    const [started, setStarted] = useState(false);
    const [startingSession, setStartingSession] = useState(false);
    const [syncingAnswer, setSyncingAnswer] = useState(false);
    const [submittingSession, setSubmittingSession] = useState(false);
    const [sessionError, setSessionError] = useState<string | null>(null);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showValidation, setShowValidation] = useState(false);
    const [navDirection, setNavDirection] = useState<'next' | 'prev'>('next');
    const activeRef = useRef<HTMLDivElement | null>(null);

    const loadActiveQuestionnaire = useCallback(async () => {
        setActiveLoading(true);
        setActiveError(null);
        setActiveStatusCode(null);
        try {
            const response = await getActiveQuestionnairesV2({
                mode: DEFAULT_MODE,
                role: questionnaireRole,
                include_full: true,
                page: 1,
                page_size: 1
            });
            const nextTemplate = response.items.length > 0 ? normalizeActiveTemplate(response.items[0]) : null;
            setActiveTemplate(nextTemplate);
        } catch (error) {
            if (error instanceof ApiError) {
                setActiveStatusCode(error.status);
            }
            setActiveError(mapApiErrorToText(error, 'No se pudo cargar el cuestionario activo.'));
            setActiveTemplate(null);
        } finally {
            setActiveLoading(false);
        }
    }, [questionnaireRole]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void loadActiveQuestionnaire();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [loadActiveQuestionnaire]);

    useEffect(() => {
        if (!started) return;
        if (!activeRef.current) return;
        requestAnimationFrame(() => {
            activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }, [currentIndex, started]);

    const resetSessionState = useCallback(() => {
        setStarted(false);
        setStartingSession(false);
        setSyncingAnswer(false);
        setSubmittingSession(false);
        setSessionError(null);
        setSessionId(null);
        setQuestions([]);
        setAnswers({});
        setCurrentIndex(0);
        setShowSuccess(false);
        setShowValidation(false);
        setNavDirection('next');
    }, []);

    const hydrateSessionAnswers = useCallback(async (nextSessionId: string) => {
        try {
            const detail = await getQuestionnaireSessionV2(nextSessionId);
            return normalizeSessionAnswers(detail);
        } catch {
            return {};
        }
    }, []);

    const startSession = useCallback(async () => {
        if (!activeTemplate?.id) return;
        setStartingSession(true);
        setSessionError(null);
        try {
            const createdSession = await createQuestionnaireSessionV2({
                mode: DEFAULT_MODE,
                role: questionnaireRole,
                title: activeTemplate.name
            });
            const nextSessionId = extractSessionId(createdSession);
            if (!nextSessionId) {
                throw new Error('Session id not found');
            }

            const [sessionPage, sessionAnswers] = await Promise.all([
                getQuestionnaireSessionPageV2(nextSessionId, { page: 1, page_size: SESSION_PAGE_SIZE }),
                hydrateSessionAnswers(nextSessionId)
            ]);

            const normalizedQuestions = normalizeQuestions(sessionPage.items as unknown[]);
            if (normalizedQuestions.length === 0) {
                setSessionError('La sesión se creó, pero no tiene preguntas disponibles.');
                return;
            }

            setSessionId(nextSessionId);
            setQuestions(normalizedQuestions);
            setAnswers(sessionAnswers);
            setCurrentIndex(0);
            setStarted(true);
            setShowValidation(false);
        } catch (error) {
            setSessionError(mapApiErrorToText(error, 'No se pudo iniciar la sesión del cuestionario.'));
        } finally {
            setStartingSession(false);
        }
    }, [activeTemplate?.id, activeTemplate?.name, hydrateSessionAnswers, questionnaireRole]);

    const handleAnswerChange = (questionId: string, value: QuestionnaireResponseValue) => {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: value
        }));
        if (showValidation) {
            const currentQuestion = questions[currentIndex];
            if (currentQuestion && currentQuestion.id === questionId && isValidAnswer(currentQuestion, value)) {
                setShowValidation(false);
            }
        }
    };

    const currentQuestion = questions[currentIndex] ?? null;
    const currentKey = currentQuestion?.id ?? '';
    const currentAnswer = currentKey ? answers[currentKey] : null;
    const currentValid = currentQuestion ? isValidAnswer(currentQuestion, currentAnswer) : false;
    const totalQuestions = questions.length;
    const progress = totalQuestions > 0
        ? Math.round(((currentIndex + 1) / totalQuestions) * 100)
        : 0;

    const persistCurrentAnswer = useCallback(async (markFinal = false) => {
        if (!sessionId || !currentQuestion) return false;
        const value = answers[currentQuestion.id];
        if (!isValidAnswer(currentQuestion, value)) return false;
        setSyncingAnswer(true);
        setSessionError(null);
        try {
            await patchQuestionnaireSessionAnswersV2(sessionId, {
                answers: [
                    {
                        question_id: currentQuestion.id,
                        value: value ?? null
                    }
                ],
                mark_final: markFinal
            });
            return true;
        } catch (error) {
            setSessionError(mapApiErrorToText(error, 'No se pudo guardar la respuesta.'));
            return false;
        } finally {
            setSyncingAnswer(false);
        }
    }, [answers, currentQuestion, sessionId]);

    const goNext = async () => {
        if (!currentQuestion) return;
        if (!currentValid) {
            setShowValidation(true);
            return;
        }
        setShowValidation(false);
        const persisted = await persistCurrentAnswer(false);
        if (!persisted) return;
        if (currentIndex < totalQuestions - 1) {
            setNavDirection('next');
            setCurrentIndex((prev) => prev + 1);
        }
    };

    const goPrevious = () => {
        setShowValidation(false);
        if (currentIndex > 0) {
            setNavDirection('prev');
            setCurrentIndex((prev) => prev - 1);
        }
    };

    const handleFinish = async () => {
        if (!currentQuestion || !currentValid || !sessionId) {
            setShowValidation(true);
            return;
        }
        setShowValidation(false);
        setSubmittingSession(true);
        setSessionError(null);
        try {
            const persisted = await persistCurrentAnswer(true);
            if (!persisted) return;
            await submitQuestionnaireSessionV2(sessionId, { force_reprocess: false });
            setShowSuccess(true);
        } catch (error) {
            setSessionError(mapApiErrorToText(error, 'No se pudo enviar el cuestionario.'));
        } finally {
            setSubmittingSession(false);
        }
    };

    const handleSuccessClose = () => {
        resetSessionState();
        void loadActiveQuestionnaire();
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        if (!started || syncingAnswer || submittingSession) return;
        if (currentIndex === totalQuestions - 1) {
            void handleFinish();
        } else {
            void goNext();
        }
    };

    return (
        <div className="plataforma-view">
            <div className={`questionnaire-shell ${started ? '' : 'is-intro'}`} onKeyDown={handleKeyDown}>
                {activeLoading ? (
                    <div className="questionnaire-state">Cargando cuestionario...</div>
                ) : activeStatusCode === 404 || !activeTemplate ? (
                    <div className="questionnaire-state">
                        <p>No hay un cuestionario activo en este momento.</p>
                        <button type="button" className="questionnaire-retry" onClick={() => void loadActiveQuestionnaire()}>
                            Reintentar
                        </button>
                    </div>
                ) : activeError ? (
                    <div className="questionnaire-state">
                        <p>{activeError}</p>
                        <button type="button" className="questionnaire-retry" onClick={() => void loadActiveQuestionnaire()}>
                            Reintentar
                        </button>
                    </div>
                ) : !started ? (
                    <div className="questionnaire-intro intro-animate">
                        <div className="questionnaire-intro-content">
                            <div className="questionnaire-intro-text">
                                <h1 className="questionnaire-title">
                                    Cuestionario de observación
                                    <span className="questionnaire-title-accent" aria-hidden="true"></span>
                                </h1>
                                <p className="questionnaire-subtitle">
                                    Responde según lo observado en las últimas 4 semanas. El cuestionario dura entre 5 y 8 minutos.
                                </p>
                                <p className="questionnaire-intro-text-body">
                                    Tu participación ayuda a construir una alerta inicial, no un diagnóstico.
                                </p>
                            </div>
                            <div className="questionnaire-intro-image">
                                <img src={questionnaireImage} alt="Vista previa del cuestionario" />
                            </div>
                        </div>
                        {sessionError ? <div className="question-warning">{sessionError}</div> : null}
                        <div className="questionnaire-intro-actions">
                            <button
                                type="button"
                                className="questionnaire-btn primary questionnaire-start"
                                onClick={() => void startSession()}
                                disabled={startingSession}
                            >
                                {startingSession ? 'Iniciando...' : 'Comenzar'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="questionnaire-workspace">
                        <div className="questionnaire-top">
                            <div className="questionnaire-heading">
                                <h1 className="questionnaire-title">{activeTemplate.name}</h1>
                                <p className="questionnaire-subtitle">Modo {DEFAULT_MODE} · Rol {questionnaireRole === 'psychologist' ? 'psicólogo' : 'cuidador'}.</p>
                                <p className="questionnaire-disclaimer">
                                    Este cuestionario no diagnostica, solo genera una alerta temprana.
                                </p>
                            </div>
                        </div>

                        <div className="questionnaire-stack">
                            {questions.map((question, index) => {
                                if (index >= currentIndex) return null;
                                const answerValue = answers[question.id];
                                if (!isValidAnswer(question, answerValue)) return null;
                                return (
                                    <button
                                        key={question.id}
                                        type="button"
                                        className="stack-item is-answered"
                                        onClick={() => {
                                            if (index === currentIndex) return;
                                            setNavDirection(index < currentIndex ? 'prev' : 'next');
                                            setCurrentIndex(index);
                                            setShowValidation(false);
                                        }}
                                    >
                                        <span className="stack-question">{question.text}</span>
                                        <span className="stack-answer">
                                            Respuesta: {formatAnswer(question, answerValue)}
                                        </span>
                                    </button>
                                );
                            })}

                            {currentQuestion ? (
                                <div className="stack-active">
                                    <div
                                        key={currentQuestion.id}
                                        className={`stack-item is-active ${navDirection === 'next' ? 'from-next' : 'from-prev'}`}
                                        ref={activeRef}
                                    >
                                        <h2 className="question-text">{currentQuestion.text}</h2>
                                        {renderQuestionInput(currentQuestion, currentAnswer, (value) => handleAnswerChange(currentQuestion.id, value as QuestionnaireResponseValue))}
                                        {showValidation && !currentValid ? (
                                            <div className="question-warning">Selecciona una respuesta para continuar.</div>
                                        ) : null}
                                        {sessionError ? <div className="question-warning">{sessionError}</div> : null}
                                        <div className="questionnaire-progress">
                                            <span className="questionnaire-progress-text">
                                                Pregunta {currentIndex + 1}/{totalQuestions}
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
                                            onClick={goPrevious}
                                            disabled={currentIndex === 0 || syncingAnswer || submittingSession}
                                        >
                                            Anterior
                                        </button>
                                        {currentIndex === totalQuestions - 1 ? (
                                            <button
                                                type="button"
                                                className="questionnaire-btn primary"
                                                onClick={() => void handleFinish()}
                                                disabled={!currentValid || syncingAnswer || submittingSession}
                                            >
                                                {submittingSession ? 'Enviando...' : 'Enviar'}
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className="questionnaire-btn primary"
                                                onClick={() => void goNext()}
                                                disabled={!currentValid || syncingAnswer || submittingSession}
                                            >
                                                {syncingAnswer ? 'Guardando...' : 'Siguiente'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : null}

                            {questions.map((question, index) => {
                                if (index <= currentIndex) return null;
                                const answerValue = answers[question.id];
                                if (!isValidAnswer(question, answerValue)) return null;
                                return (
                                    <button
                                        key={question.id}
                                        type="button"
                                        className="stack-item is-answered is-after"
                                        onClick={() => {
                                            if (index === currentIndex) return;
                                            setNavDirection(index < currentIndex ? 'prev' : 'next');
                                            setCurrentIndex(index);
                                            setShowValidation(false);
                                        }}
                                    >
                                        <span className="stack-question">{question.text}</span>
                                        <span className="stack-answer">
                                            Respuesta: {formatAnswer(question, answerValue)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {showSuccess ? (
                <div className="questionnaire-modal">
                    <div className="questionnaire-modal-card">
                        <p>Cuestionario enviado correctamente.</p>
                        <button
                            type="button"
                            className="questionnaire-btn primary"
                            onClick={handleSuccessClose}
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
