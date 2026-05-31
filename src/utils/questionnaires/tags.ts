import type { QuestionnaireTagDTO } from '../../services/questionnaires/questionnaires.types';
import { normalizeBackendText } from './presentation';

export const QUESTIONNAIRE_TAG_COLOR_OPTIONS = [
    '#215f8f',
    '#198e50',
    '#d97a1f',
    '#7b4bbf',
    '#c23f5a',
    '#4f7a6a',
    '#3e6ea8',
    '#6a6f7d'
] as const;

export const DEFAULT_QUESTIONNAIRE_TAG_COLOR = QUESTIONNAIRE_TAG_COLOR_OPTIONS[0];

function hashText(value: string) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = ((hash << 5) - hash) + value.charCodeAt(index);
        hash |= 0;
    }
    return Math.abs(hash);
}

export function resolveQuestionnaireTagId(tag: QuestionnaireTagDTO | string | null | undefined) {
    if (!tag || typeof tag === 'string') return '';
    if (typeof tag.id === 'string' && tag.id.trim().length > 0) return tag.id.trim();
    if (typeof tag.tag_id === 'string' && tag.tag_id.trim().length > 0) return tag.tag_id.trim();
    return '';
}

export function resolveQuestionnaireTagLabel(tag: QuestionnaireTagDTO | string | null | undefined) {
    if (typeof tag === 'string') return normalizeBackendText(tag, 'Etiqueta');
    if (!tag) return 'Etiqueta';
    return normalizeBackendText(tag.label ?? tag.tag ?? tag.name ?? tag.title, 'Etiqueta');
}

export function resolveQuestionnaireTagColor(tag: QuestionnaireTagDTO | string | null | undefined) {
    const explicitColor = typeof tag === 'string'
        ? tag.trim()
        : typeof tag === 'object' && tag
            ? String(tag.color ?? tag.color_hex ?? tag.hex ?? '').trim()
            : '';

    if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(explicitColor)) {
        return explicitColor;
    }

    const stableKey = typeof tag === 'string'
        ? tag
        : resolveQuestionnaireTagId(tag) || resolveQuestionnaireTagLabel(tag);
    const index = hashText(stableKey || 'Etiqueta') % QUESTIONNAIRE_TAG_COLOR_OPTIONS.length;
    return QUESTIONNAIRE_TAG_COLOR_OPTIONS[index] ?? DEFAULT_QUESTIONNAIRE_TAG_COLOR;
}
