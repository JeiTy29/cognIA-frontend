import { type FormEvent, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../../../services/api/httpClient';
import {
    createQuestionnaireQuestion,
    type AdminQuestionnaireItem,
    type CreateQuestionnaireQuestionPayload
} from '../../../services/admin/questionnaires';
import '../AdminShared.css';
import './PreguntasCuestionario.css';

interface QuestionDraft {
    id: string;
    code: string;
    text: string;
    response_type: string;
    position: number;
    response_min?: number | null;
    response_max?: number | null;
    response_options?: Array<{ label: string; value: string | number | boolean }>;
}

interface QuestionFormState {
    code: string;
    text: string;
    responseType: string;
    position: string;
    min: string;
    max: string;
    optionsText: string;
}

const RESPONSE_TYPE_OPTIONS = [
    { value: 'text', label: 'Texto' },
    { value: 'integer', label: 'Numero entero' },
    { value: 'number', label: 'Numero decimal' },
    { value: 'boolean', label: 'Si / No' },
    { value: 'likert', label: 'Likert' }
];

const initialForm: QuestionFormState = {
    code: '',
    text: '',
    responseType: 'text',
    position: '1',
    min: '',
    max: '',
    optionsText: ''
};

function mapError(error: unknown) {
    if (!(error instanceof ApiError)) return 'No se pudo agregar la pregunta.';
    if (error.status === 400) return 'Los datos de la pregunta son invalidos.';
    if (error.status === 401) return 'Sesion expirada o no autenticada.';
    if (error.status === 403) return 'No tienes permisos para agregar preguntas.';
    if (error.status === 404) return 'No se encontro la plantilla seleccionada.';
    if (error.status >= 500) return 'Error del servidor. Intenta mas tarde.';
    return 'No se pudo agregar la pregunta.';
}

function parseOptionalNumber(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptions(optionsText: string) {
    const entries = optionsText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    if (entries.length === 0) return undefined;

    return entries.map((entry) => {
        const [rawValue, rawLabel] = entry.split('|').map((part) => part.trim());
        const value = rawValue;
        const label = rawLabel && rawLabel.length > 0 ? rawLabel : rawValue;
        return { value, label };
    });
}

function resolveTemplateId(
    urlTemplateId: string | undefined,
    locationTemplate: AdminQuestionnaireItem | undefined
) {
    if (urlTemplateId && urlTemplateId.trim().length > 0) {
        return urlTemplateId.trim();
    }
    return locationTemplate?.id ?? '';
}

function resolveTemplateName(locationTemplate: AdminQuestionnaireItem | undefined) {
    if (!locationTemplate?.name) return 'Plantilla de cuestionario';
    return locationTemplate.name;
}

export default function PreguntasCuestionario() {
    const navigate = useNavigate();
    const { templateId: templateIdFromParams } = useParams();
    const location = useLocation();
    const locationState = (location.state ?? {}) as { template?: AdminQuestionnaireItem };
    const template = locationState.template;
    const templateId = resolveTemplateId(templateIdFromParams, template);
    const templateName = resolveTemplateName(template);

    const [form, setForm] = useState<QuestionFormState>(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [createdQuestions, setCreatedQuestions] = useState<QuestionDraft[]>([]);

    const nextPosition = useMemo(() => {
        if (createdQuestions.length === 0) return 1;
        return Math.max(...createdQuestions.map((question) => question.position)) + 1;
    }, [createdQuestions]);

    const resetForm = () => {
        setForm({
            ...initialForm,
            position: String(nextPosition)
        });
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setNotice(null);

        if (!templateId) {
            setError('No se encontro el identificador de la plantilla.');
            return;
        }
        if (!form.code.trim()) {
            setError('El codigo es obligatorio.');
            return;
        }
        if (!form.text.trim()) {
            setError('El texto de la pregunta es obligatorio.');
            return;
        }
        const parsedPosition = Number(form.position);
        if (!Number.isInteger(parsedPosition) || parsedPosition <= 0) {
            setError('La posicion debe ser un entero mayor que 0.');
            return;
        }

        const payload: CreateQuestionnaireQuestionPayload = {
            code: form.code.trim(),
            text: form.text.trim(),
            response_type: form.responseType,
            position: parsedPosition
        };

        const min = parseOptionalNumber(form.min);
        const max = parseOptionalNumber(form.max);
        if (typeof min === 'number') payload.response_min = min;
        if (typeof max === 'number') payload.response_max = max;

        const options = parseOptions(form.optionsText);
        if (options && options.length > 0) {
            payload.response_options = options;
        }

        setError(null);
        setSubmitting(true);
        try {
            const response = await createQuestionnaireQuestion(templateId, payload);
            const draft: QuestionDraft = {
                id:
                    (typeof response.id === 'string' && response.id) ||
                    (typeof response.question_id === 'string' && response.question_id) ||
                    `local-${Date.now()}`,
                code: payload.code,
                text: payload.text,
                response_type: payload.response_type,
                position: payload.position,
                response_min: payload.response_min ?? null,
                response_max: payload.response_max ?? null,
                response_options: payload.response_options
            };
            setCreatedQuestions((prev) =>
                [...prev, draft].sort((a, b) => a.position - b.position)
            );
            setNotice('Pregunta agregada correctamente.');
            setForm({
                ...initialForm,
                position: String(draft.position + 1)
            });
        } catch (requestError) {
            setError(mapError(requestError));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="admin-page preguntas-cuestionario-page">
            <header className="admin-header">
                <div className="admin-title">
                    <h1>Gestionar preguntas</h1>
                    <p>{templateName}</p>
                </div>
                <div className="admin-actions">
                    <button
                        type="button"
                        className="admin-btn ghost"
                        onClick={() => navigate('/admin/cuestionarios')}
                    >
                        Volver a cuestionarios
                    </button>
                </div>
            </header>

            <div className="admin-divider" aria-hidden="true" />

            <section className="preguntas-cuestionario-context">
                <div><strong>Template ID:</strong> {templateId || '--'}</div>
                {template?.version ? <div><strong>Version:</strong> {template.version}</div> : null}
                {template?.description ? <div><strong>Descripcion:</strong> {template.description}</div> : null}
            </section>

            {notice ? <div className="admin-alert success">{notice}</div> : null}
            {error ? <div className="admin-alert error">{error}</div> : null}

            <section className="preguntas-cuestionario-grid">
                <form className="admin-modal preguntas-form" onSubmit={handleSubmit}>
                    <h2>Agregar pregunta</h2>

                    <label>
                        <span>Codigo</span>
                        <input
                            type="text"
                            value={form.code}
                            onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                        />
                    </label>

                    <label>
                        <span>Texto</span>
                        <textarea
                            value={form.text}
                            onChange={(event) => setForm((prev) => ({ ...prev, text: event.target.value }))}
                        />
                    </label>

                    <label>
                        <span>Tipo de respuesta</span>
                        <select
                            value={form.responseType}
                            onChange={(event) => setForm((prev) => ({ ...prev, responseType: event.target.value }))}
                        >
                            {RESPONSE_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="preguntas-inline-fields">
                        <label>
                            <span>Posicion</span>
                            <input
                                type="number"
                                min={1}
                                value={form.position}
                                onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value }))}
                            />
                        </label>
                        <label>
                            <span>Minimo</span>
                            <input
                                type="number"
                                value={form.min}
                                onChange={(event) => setForm((prev) => ({ ...prev, min: event.target.value }))}
                            />
                        </label>
                        <label>
                            <span>Maximo</span>
                            <input
                                type="number"
                                value={form.max}
                                onChange={(event) => setForm((prev) => ({ ...prev, max: event.target.value }))}
                            />
                        </label>
                    </div>

                    <label>
                        <span>Opciones (una por linea, formato valor|etiqueta)</span>
                        <textarea
                            value={form.optionsText}
                            onChange={(event) => setForm((prev) => ({ ...prev, optionsText: event.target.value }))}
                            placeholder={'1|Nunca\n2|A veces\n3|Siempre'}
                        />
                    </label>

                    <div className="admin-modal-actions">
                        <button type="button" className="admin-btn ghost" onClick={resetForm} disabled={submitting}>
                            Limpiar
                        </button>
                        <button type="submit" className="admin-btn primary" disabled={submitting}>
                            {submitting ? 'Agregando...' : 'Agregar pregunta'}
                        </button>
                    </div>
                </form>

                <section className="preguntas-listado" aria-label="Preguntas agregadas en la sesion actual">
                    <h2>Preguntas agregadas</h2>
                    {createdQuestions.length === 0 ? (
                        <div className="admin-empty">
                            <h3>Sin preguntas cargadas</h3>
                            <p>Agrega la primera pregunta para esta plantilla.</p>
                        </div>
                    ) : (
                        <div className="preguntas-list">
                            {createdQuestions.map((question) => (
                                <article key={question.id} className="preguntas-item">
                                    <header>
                                        <strong>{question.code}</strong>
                                        <span>Posicion {question.position}</span>
                                    </header>
                                    <p>{question.text}</p>
                                    <div className="preguntas-item-meta">
                                        <span>Tipo: {question.response_type}</span>
                                        <span>Min: {question.response_min ?? '--'}</span>
                                        <span>Max: {question.response_max ?? '--'}</span>
                                    </div>
                                    {question.response_options && question.response_options.length > 0 ? (
                                        <div className="preguntas-item-options">
                                            {question.response_options.map((option) => (
                                                <span key={`${option.value}-${option.label}`}>
                                                    {String(option.value)} - {option.label}
                                                </span>
                                            ))}
                                        </div>
                                    ) : null}
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </section>
        </div>
    );
}
