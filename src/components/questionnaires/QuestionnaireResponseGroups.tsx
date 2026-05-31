import type {
    QuestionnaireHistoryResponseItemDTO,
    QuestionnaireHistoryResponsesV2Response
} from '../../services/questionnaires/questionnaires.types';
import {
    formatPercent,
    normalizeBackendText,
    normalizeDomainLabel
} from '../../utils/questionnaires/presentation';
import './QuestionnaireResponseGroups.css';

type QuestionnaireResponseGroup = {
    label: string;
    items: QuestionnaireHistoryResponseItemDTO[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toCollection(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    if (isRecord(value)) return Object.values(value);
    return [];
}

function questionnaireResponseQuestionText(item: Record<string, unknown>) {
    return normalizeBackendText(
        item.prompt ?? item.question_text ?? item.question ?? item.text,
        'Pregunta registrada'
    );
}

function questionnaireResponseAnswerText(item: Record<string, unknown>) {
    if (item.missing === true || item.is_missing === true) return 'Sin respuesta registrada';
    const answer = normalizeBackendText(
        item.answer_label ?? item.answer ?? item.answer_value ?? item.value,
        'Sin respuesta registrada'
    );
    const rawValue = item.score ?? item.numeric_value;
    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
        return `${answer} - valor ${formatPercent(rawValue)}`;
    }
    return answer;
}

function groupQuestionnaireResponses(
    responses: QuestionnaireHistoryResponsesV2Response | null | undefined
): QuestionnaireResponseGroup[] {
    const groups = new Map<string, QuestionnaireHistoryResponseItemDTO[]>();
    const directItems = responses?.items ?? [];
    const sectionItems = directItems.length > 0
        ? []
        : toCollection(responses?.sections ?? responses?.groups ?? responses?.domains).flatMap((section) => {
            if (!isRecord(section)) return [];
            return toCollection(section.items ?? section.responses ?? section.answers ?? section.questions).map((item) => {
                if (!isRecord(item)) return item;
                return {
                    ...section,
                    ...item,
                    section_title: item.section_title ?? item.section_label ?? section.section_title ?? section.title ?? section.label,
                    domain_code: item.domain_code ?? item.domain ?? section.domain_code ?? section.domain,
                    domain_label: item.domain_label ?? section.domain_label ?? section.label ?? section.title
                };
            });
        });
    [...directItems, ...sectionItems].forEach((item) => {
        if (!isRecord(item)) return;
        const label = normalizeDomainLabel(
            item.domain_label ?? item.domain ?? item.domain_code ?? item.section_title ?? item.section
        );
        const safeLabel = label === 'General' ? 'Señales globales' : label;
        groups.set(safeLabel, [...(groups.get(safeLabel) ?? []), item as QuestionnaireHistoryResponseItemDTO]);
    });
    return [...groups.entries()].map(([label, items]) => ({ label, items }));
}

interface QuestionnaireResponseGroupsProps {
    responses?: QuestionnaireHistoryResponsesV2Response | null;
    fallbackRows?: Array<{
        key: string;
        questionText: string;
        answerLabel: string;
        domainLabel?: string;
        sectionLabel?: string;
    }>;
    maxItemsPerGroup?: number;
    emptyText?: string;
}

export function QuestionnaireResponseGroups({
    responses,
    fallbackRows = [],
    maxItemsPerGroup = 14,
    emptyText = 'No hay respuestas visibles para este cuestionario con los permisos actuales.'
}: Readonly<QuestionnaireResponseGroupsProps>) {
    const groups = groupQuestionnaireResponses(responses);

    if (groups.length > 0) {
        return (
            <div className="questionnaire-response-groups">
                {groups.map((group) => (
                    <article className="questionnaire-response-group" key={group.label}>
                        <h4>{group.label}</h4>
                        {group.items.slice(0, maxItemsPerGroup).map((item, index) => (
                            <div className="questionnaire-response-card" key={`${group.label}-${item.question_id ?? item.question_code ?? index}`}>
                                <div>
                                    <span>Pregunta</span>
                                    <strong>{questionnaireResponseQuestionText(item as Record<string, unknown>)}</strong>
                                </div>
                                <div>
                                    <span>Respuesta</span>
                                    <p>{questionnaireResponseAnswerText(item as Record<string, unknown>)}</p>
                                </div>
                            </div>
                        ))}
                    </article>
                ))}
            </div>
        );
    }

    if (fallbackRows.length > 0) {
        return (
            <div className="questionnaire-response-groups">
                <article className="questionnaire-response-group">
                    <h4>Respuestas estructuradas</h4>
                    {fallbackRows.map((answer) => (
                        <div className="questionnaire-response-card" key={answer.key}>
                            <div>
                                <span>Pregunta</span>
                                <strong>{normalizeBackendText(answer.questionText, 'Pregunta registrada')}</strong>
                            </div>
                            <div>
                                <span>Respuesta</span>
                                <p>{normalizeBackendText(answer.answerLabel, 'Sin respuesta registrada')}</p>
                            </div>
                            {answer.domainLabel || answer.sectionLabel ? (
                                <small>
                                    {[answer.domainLabel, answer.sectionLabel].filter(Boolean).join(' - ')}
                                </small>
                            ) : null}
                        </div>
                    ))}
                </article>
            </div>
        );
    }

    return <p className="historial-v2-helper-text">{emptyText}</p>;
}
