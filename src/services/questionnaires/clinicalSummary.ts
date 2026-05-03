import type {
    QuestionnaireClinicalSummaryV2DTO,
    QuestionnaireRiskLevel
} from './questionnaires.types';

export interface ClinicalSummarySection {
    key: ClinicalSummarySectionKey;
    title: string;
    content: string;
}

export type ClinicalSummarySectionKey =
    | 'sintesis_general'
    | 'niveles_de_compatibilidad'
    | 'indicadores_principales_observados'
    | 'impacto_funcional'
    | 'recomendacion_profesional'
    | 'aclaracion_importante';

export interface RiskLevelPresentation {
    key: string;
    label: string;
    hint: string;
    tone: 'low' | 'moderate' | 'relevant' | 'high' | 'neutral';
}

const SECTION_DEFINITIONS: Array<{ key: ClinicalSummarySectionKey; title: string }> = [
    { key: 'sintesis_general', title: 'Síntesis general' },
    { key: 'niveles_de_compatibilidad', title: 'Niveles de compatibilidad' },
    { key: 'indicadores_principales_observados', title: 'Indicadores principales observados' },
    { key: 'impacto_funcional', title: 'Impacto funcional' },
    { key: 'recomendacion_profesional', title: 'Recomendación profesional' },
    { key: 'aclaracion_importante', title: 'Aclaración importante' }
];

export const DEFAULT_CLINICAL_DISCLAIMER =
    'Este resultado es orientativo y sirve como apoyo de alerta temprana; no constituye diagnóstico clínico definitivo. Se recomienda valoración por un profesional cualificado.';

function getNonEmptyText(value: unknown) {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '';
}

function getSectionContentFromArray(summary: QuestionnaireClinicalSummaryV2DTO | null, key: ClinicalSummarySectionKey) {
    const sections = Array.isArray(summary?.sections) ? summary.sections : [];
    const section = sections.find((item) => getNonEmptyText(item.key) === key);
    if (section) {
        return getNonEmptyText(section.content);
    }

    return '';
}

function getSectionContentFromObject(summary: QuestionnaireClinicalSummaryV2DTO | null, key: ClinicalSummarySectionKey) {
    if (!summary?.sections || Array.isArray(summary.sections) || typeof summary.sections !== 'object') {
        return '';
    }

    const record = summary.sections as Record<string, string | null>;
    return getNonEmptyText(record[key]);
}

function getSectionContentFromNarrative(summary: QuestionnaireClinicalSummaryV2DTO | null, key: ClinicalSummarySectionKey) {
    if (!summary?.simulated_diagnostic_text) return '';
    const record = summary.simulated_diagnostic_text as Record<string, unknown>;
    return getNonEmptyText(record[key]);
}

function getSectionFallback(key: ClinicalSummarySectionKey) {
    if (key === 'aclaracion_importante') {
        return DEFAULT_CLINICAL_DISCLAIMER;
    }

    return 'No se recibió contenido para esta sección en el informe actual.';
}

export function buildClinicalSummarySections(summary: QuestionnaireClinicalSummaryV2DTO | null): ClinicalSummarySection[] {
    return SECTION_DEFINITIONS.map(({ key, title }) => {
        const content =
            getSectionContentFromNarrative(summary, key) ||
            getSectionContentFromObject(summary, key) ||
            getSectionContentFromArray(summary, key) ||
            (key === 'aclaracion_importante'
                ? getSafeClinicalDisclaimer(summary)
                : getSectionFallback(key));

        return {
            key,
            title,
            content
        };
    });
}

export function getRiskLevelPresentation(value: QuestionnaireRiskLevel | null | undefined): RiskLevelPresentation {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';

    if (normalized === 'baja') {
        return {
            key: 'baja',
            label: 'Baja',
            hint: 'Lectura compatible con un nivel de alerta bajo.',
            tone: 'low'
        };
    }

    if (normalized === 'intermedia') {
        return {
            key: 'intermedia',
            label: 'Intermedia',
            hint: 'Conviene revisar el contexto con atención moderada.',
            tone: 'moderate'
        };
    }

    if (normalized === 'relevante') {
        return {
            key: 'relevante',
            label: 'Relevante',
            hint: 'Se observan señales que justifican una valoración profesional.',
            tone: 'relevant'
        };
    }

    if (normalized === 'alta') {
        return {
            key: 'alta',
            label: 'Alta',
            hint: 'Se observan señales de alerta alta que requieren revisión profesional.',
            tone: 'high'
        };
    }

    return {
        key: normalized || 'neutral',
        label: typeof value === 'string' && value.trim().length > 0 ? value.trim() : 'No disponible',
        hint: 'No se recibió un nivel de riesgo estructurado.',
        tone: 'neutral'
    };
}

export function getSafeClinicalDisclaimer(summary: QuestionnaireClinicalSummaryV2DTO | null) {
    return getNonEmptyText(summary?.disclaimer) || getSectionContentFromNarrative(summary, 'aclaracion_importante') || DEFAULT_CLINICAL_DISCLAIMER;
}

export function getClinicalComorbiditySummary(summary: QuestionnaireClinicalSummaryV2DTO | null) {
    const comorbidity = summary?.comorbidity;
    if (!comorbidity?.has_comorbidity_signal) {
        return '';
    }

    const summaryText = getNonEmptyText(comorbidity.summary);
    if (summaryText) {
        return summaryText;
    }

    const domains = Array.isArray(comorbidity.domains) ? comorbidity.domains.filter((domain) => typeof domain === 'string' && domain.trim().length > 0) : [];
    if (domains.length > 0) {
        return `Se observan posibles señales compartidas entre ${domains.join(', ')}.`;
    }

    return 'Se observan posibles señales compatibles con múltiples áreas de alerta.';
}
