import { type FormEvent, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../../../services/api/httpClient';
import {
    createQuestionnaireQuestion,
    type AdminQuestionnaireItem,
    type CreateQuestionnaireQuestionPayload,
    type QuestionnaireQuestionOptionPayload,
    type QuestionnaireQuestionResponseType
} from '../../../services/admin/questionnaires';
import { getResponseTypeLabel } from '../../../utils/presentation/naturalLanguage';
import '../AdminShared.css';
import './PreguntasCuestionario.css';

interface QuestionDraft {
    id: string;
    code: string;
    text: string;
    response_type: QuestionnaireQuestionResponseType;
    position: number;
    response_min?: number | null;
    response_max?: number | null;
    response_step?: number | null;
    response_options?: QuestionnaireQuestionOptionPayload[];
}

interface QuestionFormState {
    code: string;
    text: string;
    responseType: QuestionnaireQuestionResponseType;
    position: string;
    max: string;
    optionsText: string;
}

type QuestionTypeConfig = Readonly<{
    label: string;
    helper: string;
    exampleCode: string;
    exampleQuestion: string;
    exampleHint: string;
    fixedRange?: Readonly<{
        min: number;
        max?: number;
        step: number;
    }>;
    showLikertInfo?: boolean;
    showOptions?: boolean;
    requiresOptions?: boolean;
    showOptionalMax?: boolean;
    fixedChoiceHint?: string;
}>;

const QUESTION_TYPE_CONFIG: Record<QuestionnaireQuestionResponseType, QuestionTypeConfig> = {
    likert_0_4: {
        label: 'Likert 0–4',
        helper: 'Escala Likert de 0 a 4. Útil para medir frecuencia, acuerdo o intensidad en valores ordenados.',
        exampleCode: 'ATENCION_01',
        exampleQuestion: '¿Con qué frecuencia mantiene la atención durante una actividad?',
        exampleHint: '0 = Nunca, 4 = Siempre',
        fixedRange: { min: 0, max: 4, step: 1 },
        showLikertInfo: true
    },
    likert_1_5: {
        label: 'Likert 1–5',
        helper: 'Escala Likert de 1 a 5. Útil para medir acuerdo o frecuencia de menor a mayor.',
        exampleCode: 'ACUERDO_01',
        exampleQuestion: '¿Qué tan de acuerdo estás con la afirmación?',
        exampleHint: '1 = Muy en desacuerdo, 5 = Muy de acuerdo',
        fixedRange: { min: 1, max: 5, step: 1 },
        showLikertInfo: true
    },
    boolean: {
        label: 'Sí / No',
        helper: 'Respuesta cerrada con opciones fijas.',
        exampleCode: 'DIAGNOSTICO_PREVIO',
        exampleQuestion: '¿Cuenta con diagnóstico previo?',
        exampleHint: 'Respuesta fija Sí / No',
        fixedChoiceHint: 'Opciones fijas: Sí / No'
    },
    frequency_0_3: {
        label: 'Frecuencia 0–3',
        helper: 'Frecuencia de 0 a 3. Ejemplo: 0 = Nunca, 3 = Muy frecuente.',
        exampleCode: 'FRECUENCIA_01',
        exampleQuestion: '¿Con qué frecuencia ocurre esta conducta?',
        exampleHint: '0 = Nunca, 3 = Muy frecuente',
        fixedRange: { min: 0, max: 3, step: 1 }
    },
    intensity_0_10: {
        label: 'Intensidad 0–10',
        helper: 'Intensidad de 0 a 10.',
        exampleCode: 'INTENSIDAD_01',
        exampleQuestion: '¿Qué tan intensa fue la conducta observada?',
        exampleHint: '0 = Nada intenso, 10 = Muy intenso',
        fixedRange: { min: 0, max: 10, step: 1 }
    },
    count: {
        label: 'Conteo',
        helper: 'Conteo entero. Ejemplo: número de veces por semana.',
        exampleCode: 'REPETICIONES_SEMANA',
        exampleQuestion: '¿Cuántas veces ocurrió en la última semana?',
        exampleHint: 'Número entero',
        fixedRange: { min: 0, step: 1 },
        showOptionalMax: true
    },
    ordinal: {
        label: 'Opciones ordenadas',
        helper: 'Usa opciones ordenadas cuando necesites categorías definidas con un orden lógico.',
        exampleCode: 'NIVEL_APOYO',
        exampleQuestion: '¿Qué nivel de apoyo requiere?',
        exampleHint: 'Formato recomendado: valor|texto visible',
        showOptions: true,
        requiresOptions: true
    },
    text_context: {
        label: 'Texto contextual',
        helper: 'Respuesta abierta de texto contextual.',
        exampleCode: 'OBSERVACIONES',
        exampleQuestion: 'Describe el contexto observado.',
        exampleHint: 'Respuesta abierta de texto'
    }
};

const RESPONSE_TYPE_OPTIONS = [
    { value: 'likert_0_4', label: 'Likert 0–4' },
    { value: 'likert_1_5', label: 'Likert 1–5' },
    { value: 'boolean', label: 'Sí / No' },
    { value: 'frequency_0_3', label: 'Frecuencia 0–3' },
    { value: 'intensity_0_10', label: 'Intensidad 0–10' },
    { value: 'count', label: 'Conteo' },
    { value: 'ordinal', label: 'Opciones ordenadas' },
    { value: 'text_context', label: 'Texto contextual' }
] as const;

const QUESTION_CODE_PATTERN = /^[A-Za-z0-9_-]{2,64}$/;

const initialForm: QuestionFormState = {
    code: '',
    text: '',
    responseType: 'likert_0_4',
    position: '1',
    max: '',
    optionsText: ''
};

function extractBusinessCode(error: ApiError) {
    if (!error.payload || typeof error.payload !== 'object') return null;
    const payload = error.payload as Record<string, unknown>;
    const candidates = [payload.error, payload.code, payload.msg];
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            return candidate.trim().toLowerCase();
        }
    }
    return null;
}

function extractDetail(error: ApiError) {
    if (!error.payload || typeof error.payload !== 'object') return null;
    const payload = error.payload as Record<string, unknown>;
    if (typeof payload.detail === 'string' && payload.detail.trim().length > 0) {
        return payload.detail.trim();
    }
    if (Array.isArray(payload.details) && payload.details.length > 0) {
        return payload.details
            .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            .join(' ');
    }
    return null;
}

function mapError(error: unknown) {
    if (!(error instanceof ApiError)) return 'No se pudo agregar la pregunta.';

    const businessCode = extractBusinessCode(error);
    const detail = extractDetail(error);

    let message = 'No se pudo agregar la pregunta.';
    if (businessCode === 'validation_error') {
        message = 'Revisa los campos de la pregunta. El código, texto, tipo y posición deben cumplir el formato requerido.';
    } else if (businessCode === 'invalid_question_constraints') {
        message = 'Las restricciones de la pregunta no son válidas para el tipo seleccionado.';
    } else if (businessCode === 'response_options_required_for_ordinal') {
        message = 'Las preguntas de opciones ordenadas requieren al menos dos opciones.';
    } else if (businessCode === 'text_context_no_constraints') {
        message = 'Las preguntas de texto contextual no deben tener mínimo, máximo, paso ni opciones.';
    } else if (businessCode === 'response_min_gt_max') {
        message = 'El mínimo no puede ser mayor que el máximo.';
    } else if (businessCode === 'response_step_invalid') {
        message = 'El paso debe ser mayor que 0.';
    } else if (businessCode === 'response_options_empty') {
        message = 'Debes agregar opciones o cambiar a un tipo que no las requiera.';
    } else if (businessCode === 'code_exists') {
        message = 'Ya existe una pregunta con ese código en la plantilla.';
    } else if (businessCode === 'template_active') {
        message = 'No puedes modificar una plantilla activa. Clónala o desactívala antes de editarla.';
    } else if (businessCode === 'template_archived') {
        message = 'No puedes modificar una plantilla archivada.';
    } else if (businessCode === 'template_not_found') {
        message = 'No se encontró la plantilla seleccionada.';
    } else if (businessCode === 'db_error') {
        message = 'Error del servidor al guardar la pregunta.';
    } else if (error.status === 401) {
        message = 'Sesión expirada o no autenticada.';
    } else if (error.status === 403) {
        message = 'No tienes permisos para agregar preguntas.';
    } else if (error.status === 404) {
        message = 'No se encontró la plantilla seleccionada.';
    } else if (error.status >= 500) {
        message = 'Error del servidor al guardar la pregunta.';
    }

    if (detail && !message.includes(detail)) {
        return `${message} ${detail}`;
    }

    return message;
}

function parseOptionalInteger(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 0) return null;
    return parsed;
}

function parseOrdinalOptions(optionsText: string) {
    const lines = optionsText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    if (lines.length < 2) {
        return { error: 'Las preguntas de opciones ordenadas requieren al menos dos opciones.', options: null };
    }

    const options: QuestionnaireQuestionOptionPayload[] = [];

    for (const line of lines) {
        const separatorIndex = line.indexOf('|');
        if (separatorIndex <= 0 || separatorIndex >= line.length - 1) {
            return {
                error: 'Cada opción debe usar el formato valor|texto visible.',
                options: null
            };
        }

        const value = line.slice(0, separatorIndex).trim();
        const label = line.slice(separatorIndex + 1).trim();

        if (!value || !label) {
            return {
                error: 'Cada opción debe incluir valor y texto visible.',
                options: null
            };
        }

        options.push({ value, label });
    }

    return { error: null, options };
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

function buildQuestionPayload(form: QuestionFormState) {
    const code = form.code.trim();
    const text = form.text.trim();
    const parsedPosition = Number(form.position);
    const config = QUESTION_TYPE_CONFIG[form.responseType];

    if (!QUESTION_CODE_PATTERN.test(code)) {
        return { error: 'El código debe tener entre 2 y 64 caracteres y usar solo letras, números, guion y guion bajo.', payload: null };
    }

    if (text.length < 3 || text.length > 500) {
        return { error: 'El texto debe tener entre 3 y 500 caracteres.', payload: null };
    }

    if (!Number.isInteger(parsedPosition) || parsedPosition < 1) {
        return { error: 'La posición debe ser un entero mayor o igual a 1.', payload: null };
    }

    const payload: CreateQuestionnaireQuestionPayload = {
        code,
        text,
        response_type: form.responseType,
        position: parsedPosition
    };

    if (config.fixedRange) {
        payload.response_min = config.fixedRange.min;
        payload.response_step = config.fixedRange.step;
        if (typeof config.fixedRange.max === 'number') {
            payload.response_max = config.fixedRange.max;
        }
    }

    if (form.responseType === 'count') {
        const parsedMax = parseOptionalInteger(form.max);
        if (parsedMax === null) {
            return { error: 'El máximo opcional debe ser un entero mayor o igual a 0.', payload: null };
        }
        if (typeof parsedMax === 'number') {
            payload.response_max = parsedMax;
        }
    }

    if (form.responseType === 'ordinal') {
        const parsedOptions = parseOrdinalOptions(form.optionsText);
        if (parsedOptions.error || !parsedOptions.options) {
            return { error: parsedOptions.error ?? 'Debes agregar opciones válidas.', payload: null };
        }
        payload.response_options = parsedOptions.options;
    }

    return { error: null, payload };
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

    const currentTypeConfig = QUESTION_TYPE_CONFIG[form.responseType];

    const resetForm = () => {
        setForm({
            ...initialForm,
            responseType: form.responseType,
            position: String(nextPosition)
        });
    };

    const handleTypeChange = (nextType: QuestionnaireQuestionResponseType) => {
        setForm((prev) => ({
            ...prev,
            responseType: nextType,
            max: nextType === 'count' ? prev.max : '',
            optionsText: nextType === 'ordinal' ? prev.optionsText : ''
        }));
        setError(null);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setNotice(null);

        if (!templateId) {
            setError('No se encontró el identificador de la plantilla.');
            return;
        }

        const { error: validationError, payload } = buildQuestionPayload(form);
        if (validationError || !payload) {
            setError(validationError ?? 'Revisa los datos de la pregunta.');
            return;
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
                response_step: payload.response_step ?? null,
                response_options: payload.response_options
            };
            setCreatedQuestions((prev) =>
                [...prev, draft].sort((left, right) => left.position - right.position)
            );
            setNotice('Pregunta agregada correctamente.');
            setForm({
                ...initialForm,
                responseType: form.responseType,
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
                <div><strong>Referencia de plantilla:</strong> {templateId || '--'}</div>
                {template?.version ? <div><strong>Versión:</strong> {template.version}</div> : null}
                {template?.description ? <div><strong>Descripción:</strong> {template.description}</div> : null}
            </section>

            {notice ? <div className="admin-alert success">{notice}</div> : null}
            {error ? <div className="admin-alert error">{error}</div> : null}

            <section className="preguntas-cuestionario-grid">
                <form className="admin-modal preguntas-form" onSubmit={handleSubmit}>
                    <h2>Agregar pregunta</h2>

                    <label>
                        <span>Código</span>
                        <input
                            type="text"
                            value={form.code}
                            onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                            placeholder={currentTypeConfig.exampleCode}
                        />
                    </label>

                    <label>
                        <span>Texto</span>
                        <textarea
                            value={form.text}
                            onChange={(event) => setForm((prev) => ({ ...prev, text: event.target.value }))}
                            placeholder={currentTypeConfig.exampleQuestion}
                        />
                    </label>

                    <label>
                        <span>Tipo de respuesta</span>
                        <select
                            value={form.responseType}
                            onChange={(event) => handleTypeChange(event.target.value as QuestionnaireQuestionResponseType)}
                        >
                            {RESPONSE_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="preguntas-help-card">
                        <p className="preguntas-help-main">{currentTypeConfig.helper}</p>
                        {currentTypeConfig.showLikertInfo ? (
                            <p className="preguntas-help-secondary">
                                Una escala Likert permite responder con valores ordenados para medir acuerdo, frecuencia o intensidad.
                                En CognIA se usa como una escala cerrada con valores numéricos predefinidos.
                            </p>
                        ) : null}
                        {currentTypeConfig.fixedChoiceHint ? (
                            <p className="preguntas-help-secondary">{currentTypeConfig.fixedChoiceHint}</p>
                        ) : null}
                        <div className="preguntas-help-example">
                            <strong>Ejemplo</strong>
                            <span>Código: {currentTypeConfig.exampleCode}</span>
                            <span>Pregunta: {currentTypeConfig.exampleQuestion}</span>
                            <span>Ayuda: {currentTypeConfig.exampleHint}</span>
                        </div>
                    </div>

                    <div className="preguntas-inline-fields">
                        <label>
                            <span>Posición</span>
                            <input
                                type="number"
                                min={1}
                                step={1}
                                value={form.position}
                                onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value }))}
                            />
                        </label>

                        {currentTypeConfig.showOptionalMax ? (
                            <label>
                                <span>Máximo opcional</span>
                                <input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={form.max}
                                    onChange={(event) => setForm((prev) => ({ ...prev, max: event.target.value }))}
                                />
                            </label>
                        ) : currentTypeConfig.fixedRange ? (
                            <div className="preguntas-fixed-constraints" aria-live="polite">
                                <span>Mínimo: {currentTypeConfig.fixedRange.min}</span>
                                {typeof currentTypeConfig.fixedRange.max === 'number' ? (
                                    <span>Máximo: {currentTypeConfig.fixedRange.max}</span>
                                ) : null}
                                <span>Paso: {currentTypeConfig.fixedRange.step}</span>
                            </div>
                        ) : null}
                    </div>

                    {currentTypeConfig.showOptions ? (
                        <label>
                            <span>Opciones ordenadas</span>
                            <textarea
                                value={form.optionsText}
                                onChange={(event) => setForm((prev) => ({ ...prev, optionsText: event.target.value }))}
                                aria-label="Opciones de respuesta"
                                placeholder={'leve|Leve\nmoderado|Moderado\nalto|Alto'}
                            />
                            <small>
                                Escribe una opción por línea usando <code>valor|texto visible</code>.
                            </small>
                        </label>
                    ) : null}

                    <div className="admin-modal-actions">
                        <button type="button" className="admin-btn ghost" onClick={resetForm} disabled={submitting}>
                            Limpiar
                        </button>
                        <button type="submit" className="admin-btn primary" disabled={submitting}>
                            {submitting ? 'Agregando...' : 'Agregar pregunta'}
                        </button>
                    </div>
                </form>

                <section className="preguntas-listado" aria-label="Preguntas agregadas en la sesión actual">
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
                                        <span>Posición {question.position}</span>
                                    </header>
                                    <p>{question.text}</p>
                                    <div className="preguntas-item-meta">
                                        <span>Tipo: {getResponseTypeLabel(question.response_type, question.response_type)}</span>
                                        <span>Mínimo: {question.response_min ?? '--'}</span>
                                        <span>Máximo: {question.response_max ?? '--'}</span>
                                        <span>Paso: {question.response_step ?? '--'}</span>
                                    </div>
                                    {question.response_options && question.response_options.length > 0 ? (
                                        <div className="preguntas-item-options">
                                            {question.response_options.map((option) => (
                                                <span key={`${option.value}-${option.label}`}>
                                                    {option.value} - {option.label}
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
