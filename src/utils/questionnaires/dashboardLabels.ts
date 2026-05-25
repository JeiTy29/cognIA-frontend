import type { QuestionnaireHistoryStatusFilter } from '../../services/questionnaires/questionnaires.types';
import { getAlertLevelMeta } from '../dashboard/alerts';

type CaseLike = {
    display_label?: string | null;
    private_label?: string | null;
    case_label?: string | null;
    case_public_id?: string | null;
    case_id?: string | null;
    id?: string | null;
};

const validHistoryStatuses: QuestionnaireHistoryStatusFilter[] = [
    'draft',
    'in_progress',
    'submitted',
    'processed',
    'failed',
    'archived'
];

const domainLabels: Record<string, string> = {
    adhd: 'TDAH',
    anxiety: 'Ansiedad',
    depression: 'Depresion',
    conduct: 'Conducta',
    elimination: 'Eliminacion'
};

function cleanText(value: unknown) {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '';
}

function looksLikeTechnicalId(value: string) {
    if (!value) return false;
    const compact = value.replace(/[-_]/g, '');
    return /^[a-f0-9]{16,}$/i.test(compact);
}

export function toHistoryStatusFilter(value: string): QuestionnaireHistoryStatusFilter | undefined {
    return validHistoryStatuses.includes(value as QuestionnaireHistoryStatusFilter)
        ? (value as QuestionnaireHistoryStatusFilter)
        : undefined;
}

export function toOptionalFilterText(value: string) {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
}

export function resolveCasePrimaryLabel(caseLike: CaseLike | null | undefined) {
    const display = cleanText(caseLike?.display_label);
    const privateLabel = cleanText(caseLike?.private_label);
    const genericLabel = cleanText(caseLike?.case_label);
    const publicId = cleanText(caseLike?.case_public_id);
    const caseId = cleanText(caseLike?.case_id) || cleanText(caseLike?.id);

    if (display) return display;
    if (privateLabel) return privateLabel;
    if (genericLabel) return genericLabel;
    if (publicId) return publicId;
    if (caseId && !looksLikeTechnicalId(caseId)) return caseId;
    return 'Caso sin etiqueta';
}

export function resolveCaseCompositeLabel(caseLike: CaseLike | null | undefined) {
    const label = resolveCasePrimaryLabel(caseLike);
    const publicId = cleanText(caseLike?.case_public_id);
    if (!publicId) return label;
    if (label === publicId) return publicId;
    return `${label} - ${publicId}`;
}

export function getDashboardDomainLabel(value: string | null | undefined) {
    const normalized = cleanText(value).toLowerCase();
    if (!normalized) return 'Sin dominio';
    return domainLabels[normalized] ?? value?.trim() ?? 'Sin dominio';
}

export function getDashboardAlertLabel(value: string | null | undefined) {
    return getAlertLevelMeta(value).label;
}

