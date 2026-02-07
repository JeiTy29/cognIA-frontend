import { useMemo, useState } from 'react';
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

function getAnswerValue(answer: unknown) {
    if (typeof answer === 'number' || typeof answer === 'string' || typeof answer === 'boolean') {
        return answer;
    }
    return null;
}

function renderQuestionInput(
    question: QuestionDTO,
    value: unknown,
    onChange: (newValue: unknown) => void
) {
    switch (question.response_type) {
        case 'likert':
            return (
                <div className="question-options">
                    {likertOptions.map(option => (
                        <button
                            key={option.value}
                            type="button"
                            className={`option-pill ${value === option.value ? 'is-selected' : ''}`}
                            onClick={() => onChange(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            );
        case 'boolean':
            return (
                <div className="question-options">
                    {[{ label: 'Sí', value: true }, { label: 'No', value: false }].map(option => (
                        <button
                            key={option.label}
                            type="button"
                            className={`option-pill ${value === option.value ? 'is-selected' : ''}`}
                            onClick={() => onChange(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            );
        case 'integer': {
            const min = question.response_min ?? undefined;
            const max = question.response_max ?? undefined;
            const step = question.response_step ?? 1;
            return (
                <input
                    type="number"
                    className="question-input"
                    placeholder="Escribe un número"
                    value={typeof value === 'number' ? value : ''}
                    onChange={(event) => {
                        const nextValue = event.target.value === '' ? '' : Number(event.target.value);
                        onChange(nextValue === '' ? null : nextValue);
                    }}
                    min={min}
                    max={max}
                    step={step}
                />
            );
        }
        case 'text':
        default:
            return (
                <textarea
                    className="question-textarea"
                    rows={4}
                    placeholder="Escribe tu respuesta"
                    value={typeof value === 'string' ? value : ''}
                    onChange={(event) => onChange(event.target.value)}
                />
            );
    }
}

export default function Cuestionario() {
    const { data, loading, error, refetch } = useActiveQuestionnaire();
    const [answers, setAnswers] = useState<Record<string, unknown>>({});
    const [started, setStarted] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);

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
    const currentAnswer = currentQuestion ? answers[String(currentQuestion.id)] : null;
    const hasAnswer = getAnswerValue(currentAnswer) !== null && getAnswerValue(currentAnswer) !== '';

    const progress = totalQuestions > 0
        ? Math.round(((currentIndex + 1) / totalQuestions) * 100)
        : 0;

    const handleAnswerChange = (questionId: string | number, value: unknown) => {
        const key = String(questionId);
        setAnswers(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const goNext = () => {
        if (currentIndex < totalQuestions - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const goPrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleFinish = () => {
        setShowSuccess(true);
    };

    return (
        <div className="plataforma-view">
            <div className={`questionnaire-shell ${started ? '' : 'is-intro'}`}>
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
                    <div className="questionnaire-panel">
                        <header className="questionnaire-header">
                            <div>
                                <h1 className="questionnaire-title">{template?.name ?? 'Cuestionario CognIA'}</h1>
                                {template?.description ? (
                                    <p className="questionnaire-description">{template.description}</p>
                                ) : null}
                            </div>
                            <span className="questionnaire-version">Versión {template?.version}</span>
                        </header>

                        <div className="questionnaire-progress">
                            <span>Pregunta {currentIndex + 1} de {totalQuestions}</span>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>

                        {currentQuestion ? (
                            <div className="questionnaire-card">
                                <p className="question-text">{currentQuestion.text}</p>
                                {renderQuestionInput(
                                    currentQuestion,
                                    currentAnswer,
                                    (value) => handleAnswerChange(currentQuestion.id, value)
                                )}
                                {!hasAnswer ? (
                                    <div className="question-warning">Respuesta pendiente.</div>
                                ) : null}
                            </div>
                        ) : null}

                        <div className="questionnaire-actions">
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
                                >
                                    Finalizar
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="questionnaire-btn primary"
                                    onClick={goNext}
                                >
                                    Siguiente
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {showSuccess ? (
                <div className="questionnaire-modal">
                    <div className="questionnaire-modal-card">
                        <p>Respuestas guardadas correctamente.</p>
                        <button
                            type="button"
                            className="questionnaire-btn primary"
                            onClick={() => setShowSuccess(false)}
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
