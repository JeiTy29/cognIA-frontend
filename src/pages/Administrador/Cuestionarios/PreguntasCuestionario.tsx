import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../../../services/api/httpClient';
import {
    createQuestionnaireQuestion,
    type AdminQuestionnaireItem,
    type CreateQuestionnaireQuestionPayload,
    type QuestionnaireQuestionOptionPayload,
    type QuestionnaireQuestionResponseType
} from '../../../services/admin/questionnaires';
import '../AdminShared.css';
import './PreguntasCuestionario.css';

interface QuestionDraft {
    localId: string;
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
    text: string;
    responseType: QuestionnaireQuestionResponseType;
    max: string;
    optionsText: string;
}

type FixedResponsePreviewItem = Readonly<{
    value: string;
    label?: string;
}>;

type QuestionTypeConfig = Readonly<{
    label: string;
    helper: string;
    exampleQuestion: string;
    exampleHint: string;
    fixedRange?: Readonly<{
        min: number;
        max?: number;
        step: number;
    }>;
    showLikertInfo?: boolean;
    showOptions?: boolean;
    showOptionalMax?: boolean;
    fixedChoiceHint?: string;
    fixedResponses?: FixedResponsePreviewItem[];
    fixedResponsesDescription?: string;
}>;

const QUESTION_CODE_PREFIX: Record<QuestionnaireQuestionResponseType, string> = {
    likert_0_4: 'LIKERT04',
    likert_1_5: 'LIKERT15',
    boolean: 'SI_NO',
    frequency_0_3: 'FREC03',
    intensity_0_10: 'INT10',
    count: 'CONTEO',
    ordinal: 'ORDINAL',
    text_context: 'TEXTO'
};

const QUESTION_TYPE_CONFIG: Record<QuestionnaireQuestionResponseType, QuestionTypeConfig> = {
    likert_0_4: {
        label: 'Likert 0-4',
        helper: 'Escala Likert de 0 a 4. Útil para medir frecuencia, acuerdo o intensidad en valores ordenados.',
        exampleQuestion: '¿Con qué frecuencia mantiene la atención durante una actividad?',
        exampleHint: '0 = Nunca, 4 = Siempre',
        fixedRange: { min: 0, max: 4, step: 1 },
        showLikertInfo: true,
        fixedResponses: [
            { value: '0', label: 'Nunca' },
            { value: '1', label: 'Casi nunca' },
            { value: '2', label: 'A veces' },
            { value: '3', label: 'Frecuentemente' },
            { value: '4', label: 'Siempre' }
        ]
    },
    likert_1_5: {
        label: 'Likert 1-5',
        helper: 'Escala Likert de 1 a 5. Útil para medir acuerdo o frecuencia de menor a mayor.',
        exampleQuestion: '¿Qué tan de acuerdo estás con la afirmación?',
        exampleHint: '1 = Muy en desacuerdo, 5 = Muy de acuerdo',
        fixedRange: { min: 1, max: 5, step: 1 },
        showLikertInfo: true,
        fixedResponses: [
            { value: '1', label: 'Nunca' },
            { value: '2', label: 'Rara vez' },
            { value: '3', label: 'A veces' },
            { value: '4', label: 'Frecuentemente' },
            { value: '5', label: 'Casi siempre' }
        ]
    },
    boolean: {
        label: 'Sí / No',
        helper: 'Respuesta cerrada con opciones fijas.',
        exampleQuestion: '¿Cuenta con diagnóstico previo?',
        exampleHint: 'Respuesta fija Sí/No',
        fixedChoiceHint: 'Opciones fijas: Sí / No',
        fixedResponses: [{ value: 'Sí' }, { value: 'No' }]
    },
    frequency_0_3: {
        label: 'Frecuencia 0-3',
        helper: 'Frecuencia de 0 a 3. Ejemplo: 0 = Nunca, 3 = Muy frecuente.',
        exampleQuestion: '¿Con qué frecuencia ocurre esta conducta?',
        exampleHint: '0 = Nunca, 3 = Muy frecuente',
        fixedRange: { min: 0, max: 3, step: 1 },
        fixedResponses: [
            { value: '0', label: 'Nunca' },
            { value: '1', label: 'Ocasionalmente' },
            { value: '2', label: 'Frecuentemente' },
            { value: '3', label: 'Muy frecuente' }
        ]
    },
    intensity_0_10: {
        label: 'Intensidad 0-10',
        helper: 'Intensidad de 0 a 10.',
        exampleQuestion: '¿Qué tan intensa fue la conducta observada?',
        exampleHint: '0 = Nada intenso, 10 = Muy intenso',
        fixedRange: { min: 0, max: 10, step: 1 },
        fixedResponses: Array.from({ length: 11 }, (_, index) => ({ value: String(index) }))
    },
    count: {
        label: 'Conteo',
        helper: 'Conteo entero. Ejemplo: número de veces por semana.',
        exampleQuestion: '¿Cuántas veces ocurrió en la última semana?',
        exampleHint: 'Número entero',
        fixedRange: { min: 0, step: 1 },
        showOptionalMax: true,
        fixedResponsesDescription: 'Respuesta numérica entera. No tiene opciones predefinidas.'
    },
    ordinal: {
        label: 'Opciones ordenadas',
        helper: 'Usa opciones ordenadas cuando necesites categorías definidas con un orden lógico.',
        exampleQuestion: '¿Qué nivel de apoyo requiere?',
        exampleHint: 'Formato recomendado: valor|texto visible',
        showOptions: true
    },
    text_context: {
        label: 'Texto contextual',
        helper: 'Respuesta abierta de texto contextual.',
        exampleQuestion: 'Describe el contexto observado.',
        exampleHint: 'Respuesta abierta de texto',
        fixedResponsesDescription: 'Respuesta abierta de texto. No tiene opciones predefinidas.'
    }
};

const RESPONSE_TYPE_OPTIONS = [
    { value: 'likert_0_4', label: 'Likert 0-4' },
    { value: 'likert_1_5', label: 'Likert 1-5' },
    { value: 'boolean', label: 'Sí / No' },
    { value: 'frequency_0_3', label: 'Frecuencia 0-3' },
    { value: 'intensity_0_10', label: 'Intensidad 0-10' },
    { value: 'count', label: 'Conteo' },
    { value: 'ordinal', label: 'Opciones ordenadas' },
    { value: 'text_context', label: 'Texto contextual' }
] as const;

const QUESTION_CODE_PATTERN = /^[A-Za-z0-9_-]{2,64}$/;

const initialForm: QuestionFormState = {
    text: '',
    responseType: 'likert_0_4',
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

function translateDetailValue(code: string, detailCode: string) {
    if (detailCode === 'text_context_no_constraints') {
        return `La pregunta ${code} es de texto contextual y no debe tener mínimo, máximo, paso ni opciones.`;
    }
    if (detailCode === 'response_options_required_for_ordinal') {
        return `La pregunta ${code} requiere al menos dos opciones ordenadas.`;
    }
    if (detailCode === 'response_min_gt_max') {
        return `La pregunta ${code} tiene un mínimo mayor que el máximo.`;
    }
    if (detailCode === 'response_step_invalid') {
        return `La pregunta ${code} tiene un paso inválido.`;
    }
    if (detailCode === 'response_options_empty') {
        return `La pregunta ${code} tiene una lista de opciones vacía.`;
    }
    return `${code}: ${detailCode}`;
}

function extractDetailMessages(error: ApiError) {
    if (!error.payload || typeof error.payload !== 'object') return [];

    const payload = error.payload as Record<string, unknown>;

    if (typeof payload.detail === 'string' && payload.detail.trim().length > 0) {
        return [payload.detail.trim()];
    }

    if (Array.isArray(payload.details)) {
        return payload.details
            .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            .map((item) => item.trim());
    }

    if (payload.details && typeof payload.details === 'object' && !Array.isArray(payload.details)) {
        return Object.entries(payload.details as Record<string, unknown>)
            .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
            .map(([code, value]) => translateDetailValue(code, String(value).trim().toLowerCase()));
    }

    return [];
}

function mapError(error: unknown, context: 'save' | 'general' = 'general') {
    if (!(error instanceof ApiError)) return 'No se pudo guardar el borrador de preguntas.';

    const businessCode = extractBusinessCode(error);
    const details = extractDetailMessages(error);

    let message = 'No se pudo guardar el borrador de preguntas.';
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
        message =
            context === 'save'
                ? 'Una o más preguntas tienen códigos que ya existen en la plantilla. Cambia el tipo o vuelve a crear el borrador.'
                : 'Ya existe una pregunta con ese código en el borrador actual.';
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

    if (details.length > 0) {
        return `${message} ${details.join(' ')}`;
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

function buildGeneratedQuestionCode(
    responseType: QuestionnaireQuestionResponseType,
    positionValue: number,
    takenCodes: Set<string>
) {
    const prefix = QUESTION_CODE_PREFIX[responseType];
    let candidate = Number.isInteger(positionValue) && positionValue > 0 ? positionValue : 1;

    while (true) {
        const code = `${prefix}_${String(candidate).padStart(3, '0')}`;
        if (!takenCodes.has(code)) {
            return code;
        }
        candidate += 1;
    }
}

function buildQuestionPayload(
    form: QuestionFormState,
    generatedCode: string,
    position: number
) {
    const text = form.text.trim();
    const config = QUESTION_TYPE_CONFIG[form.responseType];

    if (!QUESTION_CODE_PATTERN.test(generatedCode)) {
        return { error: 'No se pudo generar un código válido para la pregunta.', payload: null };
    }

    if (text.length < 3 || text.length > 500) {
        return { error: 'El texto debe tener entre 3 y 500 caracteres.', payload: null };
    }

    if (!Number.isInteger(position) || position < 1) {
        return { error: 'La posición calculada del borrador no es válida.', payload: null };
    }

    const payload: CreateQuestionnaireQuestionPayload = {
        code: generatedCode,
        text,
        response_type: form.responseType,
        position
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

function compactDraftQuestions(drafts: QuestionDraft[]) {
    return drafts.map((draft, index) => ({
        ...draft,
        position: index + 1
    }));
}

function normalizeDraftText(value: string) {
    return value.trim().toLowerCase().replaceAll(/\s+/g, ' ');
}

function buildDraftStorageKey(templateId: string) {
    return `cognia_admin_question_drafts_${templateId}`;
}

function getDraftResponseSummary(draft: QuestionDraft) {
    if (draft.response_options && draft.response_options.length > 0) {
        return draft.response_options
            .map((option) => `${option.value} - ${option.label}`)
            .join(' · ');
    }

    if (draft.response_type === 'text_context') {
        return 'Respuesta abierta de texto.';
    }

    if (draft.response_type === 'count') {
        return draft.response_max != null
            ? `Conteo entero desde ${draft.response_min ?? 0} hasta ${draft.response_max}.`
            : 'Conteo entero sin opciones predefinidas.';
    }

    if (draft.response_type === 'boolean') {
        return 'Opciones fijas: Sí / No.';
    }

    if (draft.response_min != null && draft.response_max != null) {
        return `Rango fijo ${draft.response_min} a ${draft.response_max} con paso ${draft.response_step ?? 1}.`;
    }

    if (draft.response_min != null) {
        return `Mínimo ${draft.response_min} con paso ${draft.response_step ?? 1}.`;
    }

    return 'Configuración válida para el tipo seleccionado.';
}

function getQuestionTypeLabel(responseType: QuestionnaireQuestionResponseType) {
    return QUESTION_TYPE_CONFIG[responseType].label;
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
    const [savingDraft, setSavingDraft] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [draftQuestions, setDraftQuestions] = useState<QuestionDraft[]>([]);
    const [draftInitialized, setDraftInitialized] = useState(false);

    useEffect(() => {
        if (!templateId) {
            setDraftQuestions([]);
            setDraftInitialized(true);
            return;
        }

        try {
            const storedDraft = sessionStorage.getItem(buildDraftStorageKey(templateId));
            if (!storedDraft) {
                setDraftQuestions([]);
                setDraftInitialized(true);
                return;
            }

            const parsed = JSON.parse(storedDraft);
            if (Array.isArray(parsed)) {
                const restoredDrafts = compactDraftQuestions(
                    parsed.filter((item): item is QuestionDraft => Boolean(item && typeof item === 'object'))
                );
                setDraftQuestions(restoredDrafts);
                if (restoredDrafts.length > 0) {
                    setNotice('Se restauró un borrador local de preguntas no guardadas.');
                }
            }
        } catch {
            sessionStorage.removeItem(buildDraftStorageKey(templateId));
        } finally {
            setDraftInitialized(true);
        }
    }, [templateId]);

    useEffect(() => {
        if (!draftInitialized || !templateId) return;
        if (draftQuestions.length === 0) {
            sessionStorage.removeItem(buildDraftStorageKey(templateId));
            return;
        }
        sessionStorage.setItem(buildDraftStorageKey(templateId), JSON.stringify(draftQuestions));
    }, [draftInitialized, draftQuestions, templateId]);

    const currentTypeConfig = QUESTION_TYPE_CONFIG[form.responseType];
    const takenCodes = useMemo(() => new Set(draftQuestions.map((question) => question.code)), [draftQuestions]);
    const nextPosition = draftQuestions.length + 1;

    const generatedCode = useMemo(
        () => buildGeneratedQuestionCode(form.responseType, nextPosition, takenCodes),
        [form.responseType, nextPosition, takenCodes]
    );

    const parsedOrdinalPreview = useMemo(() => {
        if (form.responseType !== 'ordinal') return [];
        const parsed = parseOrdinalOptions(form.optionsText);
        return parsed.options ?? [];
    }, [form.optionsText, form.responseType]);

    const resetForm = () => {
        setForm((prev) => ({
            ...initialForm,
            responseType: prev.responseType
        }));
        setError(null);
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

    const handleAddToDraft = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setNotice(null);

        if (!templateId) {
            setError('No se encontró el identificador de la plantilla.');
            return;
        }

        const normalizedText = normalizeDraftText(form.text);
        if (draftQuestions.some((question) => normalizeDraftText(question.text) === normalizedText)) {
            setError('Ya existe una pregunta similar en el borrador.');
            return;
        }

        if (draftQuestions.some((question) => question.code === generatedCode)) {
            setError('Ya existe una pregunta con ese código en el borrador.');
            return;
        }

        const { error: validationError, payload } = buildQuestionPayload(form, generatedCode, nextPosition);
        if (validationError || !payload) {
            setError(validationError ?? 'Revisa los datos de la pregunta.');
            return;
        }

        const draft: QuestionDraft = {
            localId: `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            code: payload.code,
            text: payload.text,
            response_type: payload.response_type,
            position: payload.position,
            response_min: payload.response_min ?? null,
            response_max: payload.response_max ?? null,
            response_step: payload.response_step ?? null,
            response_options: payload.response_options
        };

        setDraftQuestions((prev) => compactDraftQuestions([...prev, draft]));
        setNotice(
            'Pregunta agregada al borrador. Esta validación evita duplicados en el borrador actual; la validación definitiva contra el servidor se realizará al guardar.'
        );
        resetForm();
    };

    const moveDraftQuestion = (localId: string, direction: 'up' | 'down') => {
        setDraftQuestions((prev) => {
            const currentIndex = prev.findIndex((question) => question.localId === localId);
            if (currentIndex < 0) return prev;

            const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
            if (targetIndex < 0 || targetIndex >= prev.length) return prev;

            const nextDrafts = [...prev];
            const [movedQuestion] = nextDrafts.splice(currentIndex, 1);
            nextDrafts.splice(targetIndex, 0, movedQuestion);
            return compactDraftQuestions(nextDrafts);
        });
        setNotice('Se actualizó el orden del borrador. El código identifica la pregunta; la posición define el orden.');
        setError(null);
    };

    const removeDraftQuestion = (localId: string) => {
        const targetQuestion = draftQuestions.find((question) => question.localId === localId);
        if (!targetQuestion) return;

        const confirmed = window.confirm(
            `Se eliminará del borrador la pregunta "${targetQuestion.code}". Esto no afecta preguntas ya guardadas en el servidor.`
        );
        if (!confirmed) return;

        setDraftQuestions((prev) =>
            compactDraftQuestions(prev.filter((question) => question.localId !== localId))
        );
        setNotice('La pregunta se eliminó del borrador local.');
        setError(null);
    };

    const discardDraft = () => {
        if (draftQuestions.length === 0) return;
        const confirmed = window.confirm(
            'Esto eliminará las preguntas no guardadas de este dispositivo. No afectará preguntas ya guardadas en el servidor.'
        );
        if (!confirmed) return;

        setDraftQuestions([]);
        if (templateId) {
            sessionStorage.removeItem(buildDraftStorageKey(templateId));
        }
        setNotice('Se descartó el borrador local.');
        setError(null);
    };

    const handleSaveDraftQuestions = async () => {
        setNotice(null);

        if (!templateId) {
            setError('No se encontró el identificador de la plantilla.');
            return;
        }

        if (draftQuestions.length === 0) {
            setError('No hay preguntas en borrador para guardar.');
            return;
        }

        const payloadArray = compactDraftQuestions(draftQuestions).map<CreateQuestionnaireQuestionPayload>((question) => ({
            code: question.code,
            text: question.text,
            response_type: question.response_type,
            position: question.position,
            response_min: question.response_min ?? undefined,
            response_max: question.response_max ?? undefined,
            response_step: question.response_step ?? undefined,
            response_options: question.response_options
        }));

        setSavingDraft(true);
        setError(null);
        try {
            await createQuestionnaireQuestion(templateId, payloadArray);
            setDraftQuestions([]);
            sessionStorage.removeItem(buildDraftStorageKey(templateId));
            setNotice(
                'Preguntas guardadas correctamente. Las preguntas guardadas ya fueron enviadas al servidor. Para visualizarlas como listado persistido se requiere endpoint de consulta por plantilla.'
            );
        } catch (requestError) {
            setError(mapError(requestError, 'save'));
        } finally {
            setSavingDraft(false);
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

            <div className="admin-divider" aria-hidden="true" />

            <section className="preguntas-cuestionario-grid">
                <form className="admin-modal preguntas-form" onSubmit={handleAddToDraft}>
                    <h2>Agregar pregunta al borrador</h2>

                    <label>
                        <span>Código generado automáticamente</span>
                        <input type="text" value={generatedCode} readOnly />
                    </label>

                    <p className="preguntas-inline-note">
                        Esta pregunta se agregará en la posición {nextPosition} del borrador.
                    </p>

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
                                Una escala Likert permite responder con valores ordenados para medir acuerdo, frecuencia
                                o intensidad. En CognIA se usa como una escala cerrada con valores numéricos
                                predefinidos.
                            </p>
                        ) : null}
                        {currentTypeConfig.fixedChoiceHint ? (
                            <p className="preguntas-help-secondary">{currentTypeConfig.fixedChoiceHint}</p>
                        ) : null}
                        <div className="preguntas-help-example">
                            <strong>Ejemplo</strong>
                            <span>Código: {generatedCode}</span>
                            <span>Pregunta: {currentTypeConfig.exampleQuestion}</span>
                            <span>Ayuda: {currentTypeConfig.exampleHint}</span>
                        </div>
                    </div>

                    <div className="preguntas-inline-fields">
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
                        ) : (
                            <div className="preguntas-fixed-constraints preguntas-fixed-constraints-muted">
                                <span>Este tipo no requiere restricciones adicionales editables.</span>
                            </div>
                        )}
                    </div>

                    <div className="preguntas-preview">
                        <h3>Respuestas disponibles</h3>
                        {currentTypeConfig.fixedResponses ? (
                            <div className="preguntas-preview-list">
                                {currentTypeConfig.fixedResponses.map((item) => (
                                    <span key={`${item.value}-${item.label ?? 'value'}`} className="preguntas-preview-chip">
                                        {item.label ? `${item.value} - ${item.label}` : item.value}
                                    </span>
                                ))}
                            </div>
                        ) : null}

                        {currentTypeConfig.fixedResponsesDescription ? (
                            <p className="preguntas-preview-text">{currentTypeConfig.fixedResponsesDescription}</p>
                        ) : null}

                        {form.responseType === 'ordinal' ? (
                            <>
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

                                {parsedOrdinalPreview.length > 0 ? (
                                    <div className="preguntas-preview-list">
                                        {parsedOrdinalPreview.map((option) => (
                                            <span key={`${option.value}-${option.label}`} className="preguntas-preview-chip">
                                                {option.value} - {option.label}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="preguntas-preview-text">
                                        Agrega al menos dos opciones usando valor|texto visible.
                                    </p>
                                )}
                            </>
                        ) : null}
                    </div>

                    <div className="admin-alert info preguntas-duplicate-note">
                        <span>
                            Esta validación evita duplicados en el borrador actual. La validación definitiva contra el
                            servidor se realizará al guardar.
                        </span>
                    </div>

                    <div className="preguntas-code-note">
                        El código identifica la pregunta; la posición define el orden.
                    </div>

                    <div className="admin-modal-actions">
                        <button type="button" className="admin-btn ghost" onClick={resetForm} disabled={savingDraft}>
                            Limpiar
                        </button>
                        <button type="submit" className="admin-btn primary" disabled={savingDraft || !templateId}>
                            Agregar al borrador
                        </button>
                    </div>
                </form>

                <section className="preguntas-listado" aria-label="Preguntas en borrador">
                    <div className="preguntas-listado-header">
                        <div>
                            <h2>Preguntas en borrador</h2>
                            <p>{draftQuestions.length} preguntas pendientes por guardar</p>
                        </div>
                        <div className="preguntas-listado-actions">
                            <button
                                type="button"
                                className="admin-btn ghost"
                                onClick={discardDraft}
                                disabled={savingDraft || draftQuestions.length === 0}
                            >
                                Descartar borrador
                            </button>
                            <button
                                type="button"
                                className="admin-btn primary"
                                onClick={() => {
                                    handleSaveDraftQuestions().catch(() => undefined);
                                }}
                                disabled={savingDraft || draftQuestions.length === 0 || !templateId}
                            >
                                {savingDraft ? 'Guardando...' : 'Guardar preguntas'}
                            </button>
                        </div>
                    </div>

                    {draftQuestions.length === 0 ? (
                        <div className="admin-empty preguntas-empty-state">
                            <h3>Sin preguntas en borrador</h3>
                            <p>
                                Agrega una pregunta para preparar el listado antes de guardarlo.
                            </p>
                        </div>
                    ) : (
                        <div className="preguntas-list">
                            {draftQuestions.map((question, index) => (
                                <article key={question.localId} className="preguntas-item">
                                    <header className="preguntas-item-header">
                                        <div>
                                            <strong>{question.code}</strong>
                                            <span>Posición {question.position}</span>
                                        </div>
                                        <div className="preguntas-item-actions">
                                            <button
                                                type="button"
                                                className="admin-btn ghost preguntas-action-btn"
                                                onClick={() => moveDraftQuestion(question.localId, 'up')}
                                                disabled={index === 0 || savingDraft}
                                            >
                                                Subir
                                            </button>
                                            <button
                                                type="button"
                                                className="admin-btn ghost preguntas-action-btn"
                                                onClick={() => moveDraftQuestion(question.localId, 'down')}
                                                disabled={index === draftQuestions.length - 1 || savingDraft}
                                            >
                                                Bajar
                                            </button>
                                            <button
                                                type="button"
                                                className="admin-btn ghost preguntas-action-btn preguntas-action-danger"
                                                onClick={() => removeDraftQuestion(question.localId)}
                                                disabled={savingDraft}
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </header>

                                    <p>{question.text}</p>

                                    <div className="preguntas-item-meta">
                                        <span>Tipo: {getQuestionTypeLabel(question.response_type)}</span>
                                        <span>Resumen: {getDraftResponseSummary(question)}</span>
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
