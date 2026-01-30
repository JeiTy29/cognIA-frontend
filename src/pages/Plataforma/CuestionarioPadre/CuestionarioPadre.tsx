import '../Plataforma.css';
import './CuestionarioPadre.css';
import { useMemo, useState } from 'react';
import { useActiveQuestionnaire } from '../../../hooks/questionnaires/useActiveQuestionnaire';
import type { QuestionDTO } from '../../../services/questionnaires/questionnaires.types';
import { ApiError } from '../../../services/api/httpClient';

const likertOptions = [
    { value: 1, label: 'Nunca' },
    { value: 2, label: 'Rara vez' },
    { value: 3, label: 'A veces' },
    { value: 4, label: 'Frecuentemente' },
    { value: 5, label: 'Casi siempre' }
];

function renderQuestionInput(
    question: QuestionDTO,
    value: unknown,
    onChange: (newValue: unknown) => void
) {
    const name = `question-${question.id}`;

    switch (question.response_type) {
        case 'likert':
            return (
                <div className="question-options">
                    {likertOptions.map(option => (
                        <label key={option.value} className="option-pill">
                            <input
                                type="radio"
                                name={name}
                                value={option.value}
                                checked={value === option.value}
                                onChange={() => onChange(option.value)}
                            />
                            <span>{option.label}</span>
                        </label>
                    ))}
                </div>
            );
        case 'boolean':
            return (
                <div className="question-options">
                    {[{ label: 'S\u00ed', value: true }, { label: 'No', value: false }].map(option => (
                        <label key={option.label} className="option-pill">
                            <input
                                type="radio"
                                name={name}
                                checked={value === option.value}
                                onChange={() => onChange(option.value)}
                            />
                            <span>{option.label}</span>
                        </label>
                    ))}
                </div>
            );
        case 'integer': {
            const min = question.response_min ?? undefined;
            const max = question.response_max ?? undefined;
            const step = question.response_step ?? undefined;
            return (
                <input
                    type="number"
                    className="question-input"
                    placeholder="Escribe un n\u00famero"
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
                    rows={3}
                    placeholder="Escribe tu respuesta"
                    value={typeof value === 'string' ? value : ''}
                    onChange={(event) => onChange(event.target.value)}
                />
            );
    }
}

export default function CuestionarioPadre() {
    const { data, loading, error, refetch } = useActiveQuestionnaire();
    const [answers, setAnswers] = useState<Record<string, unknown>>({});

    const errorStatus = useMemo(() => {
        if (error && error instanceof ApiError) {
            return error.status;
        }
        return null;
    }, [error]);

    const template = data?.questionnaire_template;
    const questions = data?.questions ?? [];

    const handleAnswerChange = (questionId: string | number, value: unknown) => {
        const key = String(questionId);
        setAnswers(prev => ({
            ...prev,
            [key]: value
        }));
    };

    return (
        <div className="plataforma-view">
            <div className="questionnaire-panel">
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
                ) : (
                    <>
                        <header className="questionnaire-header">
                            <div>
                                <h1 className="questionnaire-title">{template?.name}</h1>
                                {template?.description ? (
                                    <p className="questionnaire-description">{template.description}</p>
                                ) : null}
                            </div>
                            <span className="questionnaire-version">Versi\u00f3n {template?.version}</span>
                        </header>

                        <div className="questionnaire-list">
                            {questions.map((question, index) => (
                                <div key={question.id} className="question-item">
                                    <div className="question-number">{index + 1}.</div>
                                    <div className="question-body">
                                        <p className="question-text">{question.text}</p>
                                        {renderQuestionInput(
                                            question,
                                            answers[String(question.id)],
                                            (value) => handleAnswerChange(question.id, value)
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button type="button" className="questionnaire-submit" disabled>
                            Guardar (pr\u00f3ximamente)
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
