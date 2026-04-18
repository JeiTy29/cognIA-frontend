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
    QuestionnaireV2Mode
} from '../../../services/questionnaires/questionnaires.types';
import questionnaireImage from '../../../assets/Imagenes/Cuestionario.svg';
import { useAuth } from '../../../hooks/auth/useAuth';

const DEFAULT_MODE: QuestionnaireV2Mode = 'complete';
const SESSION_PAGE_SIZE = 200;
const MIN_TEXT_LENGTH = 3;

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
                (answer.value as QuestionnaireResponseValue) ??
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
                response_type: toText(record.response_type, 'text'),
                position: Number.isFinite(Number(record.position)) ? Number(record.position) : index + 1,
                response_min: Number.isFinite(Number(record.response_min)) ? Number(record.response_min) : null,
                response_max: Number.isFinite(Number(record.response_max)) ? Number(record.response_max) : null,
                response_step: Number.isFinite(Number(record.response_step)) ? Number(record.response_step) : null,
                response_options: Array.isArray(record.response_options)
                    ? (record.response_options as Array<number | string>)
                    : null
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

function isValid(question: QuestionnaireQuestionV2DTO, value: unknown) {
    if (question.response_type === 'text') return typeof value === 'string' && value.trim().length >= MIN_TEXT_LENGTH;
    if (question.response_type === 'integer') return typeof value === 'number' && Number.isInteger(value) && value >= 0;
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
        try {
            const created = await createQuestionnaireSessionV2({
                mode: selectedMode,
                role: apiRole
            });
            const createdRecord = created as Record<string, unknown>;
            const id = toText(createdRecord.id) || toText(createdRecord.session_id);
            if (!id) throw new Error('missing_session_id');

            const [allQuestions, detail] = await Promise.all([
                loadAllSessionQuestions(id),
                getQuestionnaireSessionV2(id)
            ]);
            if (allQuestions.length === 0) throw new Error('empty_questions');

            const detailAnswers = (detail as Record<string, unknown>).answers;
            const initialAnswers = normalizeAnswerDictionary(detailAnswers);

            setSessionId(id);
            setQuestions(allQuestions);
            setAnswers(initialAnswers);
            setCurrentIndex(0);
            setStarted(true);
        } catch (requestError) {
            setError(mapError(requestError, 'No se pudo iniciar la sesion del cuestionario.'));
        } finally {
            setWorking(false);
        }
    }, [apiRole, loadAllSessionQuestions, selectedMode]);

    const currentQuestion = questions[currentIndex] ?? null;
    const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;
    const canContinue = currentQuestion ? isValid(currentQuestion, currentAnswer) : false;
    const progress = questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;

    const saveCurrent = async (markFinal = false) => {
        if (!sessionId || !currentQuestion) return false;
        const value = answers[currentQuestion.id];
        if (!isValid(currentQuestion, value)) return false;

        await patchQuestionnaireSessionAnswersV2(sessionId, {
            answers: [{ question_id: currentQuestion.id, answer: value ?? null }],
            mark_final: markFinal
        });
        return true;
    };

    const handleNext = async () => {
        if (!currentQuestion || !canContinue) return;
        setWorking(true);
        setError(null);
        try {
            const saved = await saveCurrent(false);
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
            const saved = await saveCurrent(true);
            if (!saved) return;
            await submitQuestionnaireSessionV2(sessionId, { force_reprocess: false });
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
                                        ) : currentQuestion.response_type === 'integer' ? (
                                            <input
                                                type="number"
                                                className="question-input"
                                                value={typeof currentAnswer === 'number' ? currentAnswer : ''}
                                                onChange={(event) => onAnswerChange(event.target.value === '' ? null : Number(event.target.value))}
                                            />
                                        ) : (
                                            <div className="question-options">
                                                {(currentQuestion.response_type === 'likert'
                                                    ? LIKERT
                                                    : [{ value: true, label: 'Si' }, { value: false, label: 'No' }]
                                                ).map((option) => (
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
