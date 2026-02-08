import { useEffect, useMemo, useRef, useState } from 'react';
import '../Plataforma.css';
import './Cuestionario.css';
import { useActiveQuestionnaire } from '../../../hooks/questionnaires/useActiveQuestionnaire';
import type { QuestionDTO } from '../../../services/questionnaires/questionnaires.types';
import { ApiError } from '../../../services/api/httpClient';
import questionnaireImage from '../../../assets/Imagenes/Cuestionario.svg';

const likertOptions = [
    { value: 1, label: 'Nunca' },
    { value: 2, label: 'Rara vez' },
    { value: 3, label: 'A veces' },
    { value: 4, label: 'Frecuentemente' },
    { value: 5, label: 'Casi siempre' }
];

const MIN_TEXT_LENGTH = 3;

function isValidAnswer(question: QuestionDTO, value: unknown) {
    switch (question.response_type) {
        case 'likert':
        case 'boolean':
            return value !== null && value !== undefined && value !== '';
        case 'integer': {
            if (typeof value !== 'number' || Number.isNaN(value) || !Number.isInteger(value)) return false;
            const minValue = Math.max(0, question.response_min ?? 0);
            if (value < minValue) return false;
            if (question.response_max !== null && value > question.response_max) return false;
            return true;
        }
        case 'text':
        default: {
            if (typeof value !== 'string') return false;
            return value.trim().length >= MIN_TEXT_LENGTH;
        }
    }
}

function formatAnswer(question: QuestionDTO, value: unknown) {
    if (value === null || value === undefined || value === '') return '';
    switch (question.response_type) {
        case 'boolean':
            return value === true ? 'Sí' : value === false ? 'No' : String(value);
        case 'likert': {
            const options = Array.isArray(question.response_options) && question.response_options.length > 0
                ? question.response_options.map(option => ({ value: option, label: String(option) }))
                : likertOptions;
            const match = options.find(option => option.value === value);
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
    question: QuestionDTO,
    value: unknown,
    onChange: (newValue: unknown) => void
) {
    switch (question.response_type) {
        case 'likert': {
            const options = Array.isArray(question.response_options) && question.response_options.length > 0
                ? question.response_options.map(option => ({
                    value: option,
                    label: String(option)
                }))
                : likertOptions;
            return (
                <div className="question-options">
                    {options.map(option => (
                        <button
                            key={option.value}
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
                    {[{ label: 'Sí', value: true }, { label: 'No', value: false }].map(option => (
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
                        Estas respuestas no afectan el resultado de Random Forest; ayudan al psicólogo a interpretar mejor la situación del niño.
                    </span>
                </div>
            );
    }
}

export default function Cuestionario() {
    const { data, loading, error, refetch } = useActiveQuestionnaire();
    const [answers, setAnswers] = useState<Record<string, unknown>>({});
    const [started, setStarted] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showValidation, setShowValidation] = useState(false);
    const [navDirection, setNavDirection] = useState<'next' | 'prev'>('next');
    const activeRef = useRef<HTMLDivElement | null>(null);

    const errorStatus = useMemo(() => {
        if (error && error instanceof ApiError) {
            return error.status;
        }
        return null;
    }, [error]);

    const template = data?.questionnaire_template;
    const questions = data?.questions ?? [];
    const totalQuestions = questions.length;

    const currentQuestion = questions[currentIndex];
    const currentKey = currentQuestion ? String(currentQuestion.id) : '';
    const currentAnswer = currentQuestion ? answers[currentKey] : null;
    const currentValid = currentQuestion ? isValidAnswer(currentQuestion, currentAnswer) : false;

    const progress = totalQuestions > 0
        ? Math.round(((currentIndex + 1) / totalQuestions) * 100)
        : 0;

    useEffect(() => {
        if (!started) return;
        if (!activeRef.current) return;
        requestAnimationFrame(() => {
            activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }, [currentIndex, started]);

    const handleAnswerChange = (questionId: string | number, value: unknown) => {
        const key = String(questionId);
        setAnswers(prev => ({
            ...prev,
            [key]: value
        }));
        if (currentQuestion && questionId === currentQuestion.id) {
            const isValid = isValidAnswer(currentQuestion, value);
            if (isValid) {
                setShowValidation(false);
            }
        }
    };

    const goNext = () => {
        if (!currentQuestion) return;
        if (!currentValid) {
            setShowValidation(true);
            return;
        }
        setShowValidation(false);
        if (currentIndex < totalQuestions - 1) {
            setNavDirection('next');
            setCurrentIndex(prev => prev + 1);
        }
    };

    const goPrevious = () => {
        setShowValidation(false);
        if (currentIndex > 0) {
            setNavDirection('prev');
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleFinish = () => {
        if (!currentQuestion || !currentValid) {
            setShowValidation(true);
            return;
        }
        setShowValidation(false);
        setShowSuccess(true);
    };

    const handleSuccessClose = () => {
        setShowSuccess(false);
        setStarted(false);
        setCurrentIndex(0);
        setAnswers({});
        setShowValidation(false);
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (currentIndex === totalQuestions - 1) {
                handleFinish();
            } else {
                goNext();
            }
        }
    };

    return (
        <div className="plataforma-view">
            <div className={`questionnaire-shell ${started ? '' : 'is-intro'}`} onKeyDown={handleKeyDown}>
                {loading ? (
                    <div className="questionnaire-state">Cargando cuestionario...</div>
                ) : errorStatus === 404 ? (
                    <div className="questionnaire-state">
                        <p>No hay un cuestionario activo en este momento.</p>
                        <button type="button" className="questionnaire-retry" onClick={refetch}>
                            Reintentar
                        </button>
                    </div>
                ) : error ? (
                    <div className="questionnaire-state">
                        <p>No se pudo cargar el cuestionario. Intenta nuevamente.</p>
                        <button type="button" className="questionnaire-retry" onClick={refetch}>
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
                                    Responde según lo observado en las últimas 4 semanas. El cuestionario dura entre 5 y 8 minutos y
                                    reúne {totalQuestions} preguntas para detectar señales tempranas.
                                </p>
                                <p className="questionnaire-intro-text-body">
                                    Tu participación ayuda a construir una alerta inicial, no un diagnóstico. Las respuestas son anónimas
                                    y se enfocan únicamente en el comportamiento observado.
                                </p>
                            </div>
                            <div className="questionnaire-intro-image">
                                <img src={questionnaireImage} alt="Vista previa del cuestionario" />
                            </div>
                        </div>
                        <div className="questionnaire-intro-actions">
                            <button
                                type="button"
                                className="questionnaire-btn primary questionnaire-start"
                                onClick={() => setStarted(true)}
                            >
                                Comenzar
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="questionnaire-workspace">
                        <div className="questionnaire-top">
                            <div className="questionnaire-heading">
                                <h1 className="questionnaire-title">{template?.name ?? 'Cuestionario de observación'}</h1>
                                <p className="questionnaire-subtitle">Responde según lo observado en las últimas 4 semanas.</p>
                                <p className="questionnaire-disclaimer">
                                    Este cuestionario no diagnostica, solo genera una alerta temprana.
                                </p>
                            </div>
                        </div>

                        <div className="questionnaire-stack">
                            {questions.map((question, index) => {
                                if (index >= currentIndex) return null;
                                const key = String(question.id);
                                const answerValue = answers[key];
                                if (!isValidAnswer(question, answerValue)) {
                                    return null;
                                }
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
                                        {renderQuestionInput(
                                            currentQuestion,
                                            currentAnswer,
                                            (value) => handleAnswerChange(currentQuestion.id, value)
                                        )}
                                        {showValidation && !currentValid ? (
                                            <div className="question-warning">Selecciona una respuesta para continuar.</div>
                                        ) : null}
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
                                            disabled={currentIndex === 0}
                                        >
                                            Anterior
                                        </button>
                                        {currentIndex === totalQuestions - 1 ? (
                                            <button
                                                type="button"
                                                className="questionnaire-btn primary"
                                                onClick={handleFinish}
                                                disabled={!currentValid}
                                            >
                                                Guardar
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className="questionnaire-btn primary"
                                                onClick={goNext}
                                                disabled={!currentValid}
                                            >
                                                Siguiente
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : null}

                            {questions.map((question, index) => {
                                if (index <= currentIndex) return null;
                                const key = String(question.id);
                                const answerValue = answers[key];
                                if (!isValidAnswer(question, answerValue)) {
                                    return null;
                                }
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
                        <p>Cuestionario guardado correctamente.</p>
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
