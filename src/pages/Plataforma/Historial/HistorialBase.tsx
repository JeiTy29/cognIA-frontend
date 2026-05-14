import { useMemo, useState } from 'react';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { Modal } from '../../../components/Modal/Modal';
import { useQuestionnaireHistoryV2 } from '../../../hooks/questionnaires/useQuestionnaireHistoryV2';
import { ApiError } from '../../../services/api/httpClient';
import {
    addQuestionnaireHistoryTagV2,
    deleteQuestionnaireHistoryTagV2,
    downloadQuestionnaireHistoryPdfV2,
    generateQuestionnaireHistoryPdfV2,
    getQuestionnaireClinicalSummaryV2,
    getQuestionnaireHistoryDetailV2,
    getQuestionnaireHistoryPdfV2,
    getQuestionnaireHistoryResultsV2,
    shareQuestionnaireHistoryV2
} from '../../../services/questionnaires/questionnaires.api';
import {
    getClinicalComorbiditySummary,
    getRiskLevelPresentation,
    getSafeClinicalDisclaimer
} from '../../../services/questionnaires/clinicalSummary';
import type {
    QuestionnaireClinicalNarrativeV2DTO,
    QuestionnaireClinicalSummaryV2DTO,
    QuestionnaireHistoryDetailV2DTO,
    QuestionnaireHistoryItemV2DTO,
    QuestionnairePdfInfoV2DTO,
    QuestionnaireSecureResultsV2DTO,
    QuestionnaireShareResponseDTO,
    QuestionnaireTagDTO,
    QuestionnaireTagVisibility
} from '../../../services/questionnaires/questionnaires.types';
import {
    buildSafeDisplayRows,
    formatDateTimeEsCO,
    getModeLabel,
    getRoleLabel,
    getStatusLabel,
    mapApiErrorToUserMessage
} from '../../../utils/presentation/naturalLanguage';
import './HistorialBase.css';

type HistorialRole = 'padre' | 'psicologo';

interface HistorialBaseProps {
    role: HistorialRole;
}

interface BulletItem {
    key: string;
    text: string;
}

interface CompatibilityItem {
    key: string;
    domain: string;
    probability: string;
    risk: string;
}

interface SummaryPresentation {
    bullets: Array<{ key: string; domain: string; level: string }>;
    levelText: string | null;
    paragraphs: string[];
}

const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'draft', label: 'Borrador' },
    { value: 'in_progress', label: 'En progreso' },
    { value: 'submitted', label: 'Enviado' },
    { value: 'processed', label: 'Procesado' },
    { value: 'failed', label: 'Fallido' },
    { value: 'archived', label: 'Archivado' }
];

const pageSizeOptions = [
    { value: '10', label: '10' },
    { value: '20', label: '20' },
    { value: '50', label: '50' }
];

const tagVisibilityOptions = [
    { value: 'private', label: 'Privado' },
    { value: 'shared', label: 'Compartido' }
];

const tagColorOptions = [
    { value: '#215f8f', label: 'Azul' },
    { value: '#198e50', label: 'Verde' },
    { value: '#d97a1f', label: 'Naranja' },
    { value: '#7b4bbf', label: 'Violeta' },
    { value: '#c23f5a', label: 'Frambuesa' },
    { value: '#4f7a6a', label: 'Oliva' },
    { value: '#3e6ea8', label: 'Índigo' },
    { value: '#6a6f7d', label: 'Gris' }
];

const defaultTagColor = tagColorOptions[0].value;

const DEFAULT_SHARE_PAYLOAD = {
    expires_in_hours: 168,
    max_uses: 10,
    grant_can_tag: false,
    grant_can_download_pdf: true
} as const;

const hiddenResultFields = [
    'id',
    'session_id',
    'questionnaire_id',
    'questionnaire_template_id',
    'model_id',
    'model_version',
    'mode_key',
    'raw',
    'payload',
    'metadata',
    'download_url',
    'file_id',
    'mime_type'
];

const DOMAIN_LABELS: Record<string, string> = {
    adhd: 'TDAH',
    conduct: 'Conducta',
    conduct_disorder: 'Conducta',
    elimination: 'Eliminación',
    elimination_disorder: 'Eliminación',
    anxiety: 'Ansiedad',
    anxiety_disorder: 'Ansiedad',
    depression: 'Depresión',
    depressive_disorder: 'Depresión'
};

const TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
    [/Ã¡/g, 'á'],
    [/Ã©/g, 'é'],
    [/Ã­/g, 'í'],
    [/Ã³/g, 'ó'],
    [/Ãº/g, 'ú'],
    [/Ã/g, 'Á'],
    [/Ã‰/g, 'É'],
    [/Ã/g, 'Í'],
    [/Ã“/g, 'Ó'],
    [/Ãš/g, 'Ú'],
    [/Ã±/g, 'ñ'],
    [/Ã‘/g, 'Ñ'],
    [/Â¿/g, '¿'],
    [/Â¡/g, '¡'],
    [/â€“/g, '–'],
    [/â€”/g, '—'],
    [/â€¦/g, '…'],
    [/â€¢/g, '•'],
    [/â€œ/g, '"'],
    [/â€/g, '"'],
    [/â€™/g, "'"],
    [/Â·/g, '·'],
    [/sesi\?n/gi, 'sesión'],
    [/evaluaci\?n/gi, 'evaluación'],
    [/diagn\?stico/gi, 'diagnóstico'],
    [/cl\?nico/gi, 'clínico'],
    [/informaci\?n/gi, 'información'],
    [/psicol\?gica/gi, 'psicológica'],
    [/m\?dica/gi, 'médica'],
    [/orientaci\?n/gi, 'orientación'],
    [/recomendaci\?n/gi, 'recomendación'],
    [/s\?ntesis/gi, 'síntesis'],
    [/aclaraci\?n/gi, 'aclaración'],
    [/actualizaci\?n/gi, 'actualización'],
    [/patr\?n/gi, 'patrón'],
    [/se\?ales/gi, 'señales'],
    [/tambi\?n/gi, 'también'],
    [/seg\?n/gi, 'según'],
    [/respondi\?/gi, 'respondió'],
    [/\?ltima/gi, 'Última'],
    [/preparaci\?n/gi, 'preparación'],
    [/generaci\?n/gi, 'generación'],
    [/todav\?a/gi, 'todavía'],
    [/a\?n/gi, 'aún'],
    [/l\?mite/gi, 'límite'],
    [/tama\?o/gi, 'tamaño'],
    [/p\?gina/gi, 'página']
];

const NON_TEXT_PATTERNS = [/https?:\/\//i, /^[A-Za-z0-9_-]{6,}$/];

function runHistoryTask(task: () => Promise<void>) {
    task().catch(() => undefined);
}

function getString(value: unknown, fallback = '--') {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function readOptionalString(value: unknown) {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function toRecord(payload: unknown): Record<string, unknown> | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    return payload as Record<string, unknown>;
}

function resolveTagId(tag: QuestionnaireTagDTO) {
    if (typeof tag.id === 'string' && tag.id.trim().length > 0) return tag.id;
    if (typeof tag.tag_id === 'string' && tag.tag_id.trim().length > 0) return tag.tag_id;
    return '';
}

function normalizeTagColor(color: string | null | undefined) {
    const value = (color ?? '').trim();
    return value || defaultTagColor;
}

function getTagVisibilityLabel(visibility: string | null | undefined) {
    const normalized = (visibility ?? '').trim().toLowerCase();
    if (normalized === 'private') return 'Privado';
    if (normalized === 'shared') return 'Compartido';
    return '--';
}

function shouldPreserveRawText(value: string) {
    return NON_TEXT_PATTERNS.some((pattern) => pattern.test(value));
}

function formatDomainLabel(domain: unknown): string {
    const raw = typeof domain === 'string' ? domain.trim() : '';
    if (!raw) return 'No disponible';
    const normalized = raw.toLowerCase().replace(/-/g, '_');
    if (DOMAIN_LABELS[normalized]) return DOMAIN_LABELS[normalized];

    const readable = raw
        .replace(/[_-]+/g, ' ')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

    if (!readable) return 'No disponible';
    return readable.charAt(0).toUpperCase() + readable.slice(1);
}

function replaceKnownDomainsInText(text: string) {
    return Object.entries(DOMAIN_LABELS).sort((left, right) => right[0].length - left[0].length).reduce(
        (current, [domainKey, label]) =>
            current.replace(new RegExp(`\\b${domainKey.replace(/_/g, '[_-]')}\\b`, 'gi'), label),
        text
    );
}

function normalizeMojibakeText(value: string) {
    if (!value.trim() || shouldPreserveRawText(value)) return value;

    let next = value;
    for (const [pattern, replacement] of TEXT_REPLACEMENTS) {
        next = next.replace(pattern, replacement);
    }

    next = replaceKnownDomainsInText(next);
    return next.replace(/\s+/g, ' ').trim();
}

function normalizeClinicalTextPresentation(value: unknown, fallback = 'No disponible') {
    if (typeof value !== 'string' || value.trim().length === 0) return fallback;
    return normalizeMojibakeText(value);
}

function toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim().length > 0) {
        const normalized = value.replace(',', '.');
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function formatProbability(value: unknown) {
    const numeric = toNumber(value);
    if (numeric === null) return 'No disponible';

    const percentValue = numeric <= 1 ? numeric * 100 : numeric;
    const rounded = Math.abs(percentValue - Math.round(percentValue)) < 0.05
        ? Math.round(percentValue)
        : Number(percentValue.toFixed(1));

    return `${new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: Number.isInteger(rounded) ? 0 : 1,
        maximumFractionDigits: 1
    }).format(rounded)}%`;
}

function formatRiskLabel(value: unknown) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    const labels: Record<string, string> = {
        low: 'bajo',
        baja: 'bajo',
        moderate: 'intermedio',
        intermedia: 'intermedio',
        medium: 'intermedio',
        elevated: 'elevado',
        elevada: 'elevado',
        high: 'alto',
        alta: 'alto',
        critical_review: 'revisión prioritaria',
        relevant: 'relevante',
        relevante: 'relevante',
        unknown: 'no disponible'
    };

    if (!normalized) return 'no disponible';
    return labels[normalized] ?? normalizeClinicalTextPresentation(value, 'no disponible').toLowerCase();
}

function formatCompatibilityLevel(value: unknown) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    const labels: Record<string, string> = {
        baja: 'baja',
        intermedia: 'intermedia',
        elevada: 'elevada',
        alta: 'alta',
        critical_review: 'revisión prioritaria'
    };

    if (!normalized) return 'no disponible';
    return labels[normalized] ?? normalizeClinicalTextPresentation(value, 'no disponible').toLowerCase();
}

function getApiErrorCode(error: unknown) {
    if (!(error instanceof ApiError)) return null;
    const payload = toRecord(error.payload);
    const codeCandidates = [
        readOptionalString(payload?.error),
        readOptionalString(payload?.code),
        readOptionalString(payload?.msg)
    ].filter((candidate): candidate is string => Boolean(candidate));
    if (codeCandidates.length === 0) return null;
    return codeCandidates[0].trim().toLowerCase();
}

function buildActionErrorMessage(error: unknown, fallback: string) {
    const code = getApiErrorCode(error);
    if (code === 'plaintext_not_allowed' || code === 'encrypted_transport_required_for_sensitive_endpoint') {
        return 'No se pudo completar la acción porque requiere transporte seguro. Intenta nuevamente.';
    }
    if (code === 'transport_key_failed') {
        return 'No se pudo preparar el canal seguro. Intenta nuevamente.';
    }
    if (code === 'forbidden' || (error instanceof ApiError && error.status === 403)) {
        return 'No tienes permisos para realizar esta acción.';
    }
    if (code === 'not_found' || (error instanceof ApiError && error.status === 404)) {
        return 'No se encontró el recurso solicitado.';
    }
    if (code === 'pdf_file_missing') {
        return 'El PDF todavía no está disponible. Intenta generarlo nuevamente.';
    }
    if (code === 'runtime_artifact_unavailable') {
        return 'El motor de análisis no está disponible. El resultado no puede recalcularse en este momento.';
    }

    return mapApiErrorToUserMessage(error, fallback);
}

function canLoadClinicalArtifacts(status: string | null | undefined) {
    const normalized = (status ?? '').trim().toLowerCase();
    return normalized === 'submitted' || normalized === 'processed';
}

function resolveQuestionnaireId(
    detail: QuestionnaireHistoryDetailV2DTO | null,
    sharePayload: QuestionnaireShareResponseDTO | null
) {
    const fromShare = sharePayload?.questionnaire_id;
    if (typeof fromShare === 'string' && fromShare.trim().length > 0) return fromShare.trim();

    const candidates: unknown[] = [detail?.questionnaire_id, detail?.questionnaire_template_id];
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            return candidate.trim();
        }
    }

    return null;
}

function downloadBlob(blob: Blob, filename: string) {
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(href);
}

function getPdfStatusLabel(status: string | undefined) {
    const normalized = (status ?? '').trim().toLowerCase();
    if (!normalized) return 'Sin generar';
    if (['ready', 'completed', 'generated', 'available', 'done'].includes(normalized)) return 'Listo para descargar';
    if (['pending', 'queued', 'requested'].includes(normalized)) return 'En preparación';
    if (['processing', 'running', 'building'].includes(normalized)) return 'Preparándose';
    if (['failed', 'error'].includes(normalized)) return 'Error en generación';
    return normalizeClinicalTextPresentation(status ?? '', 'Sin generar');
}

function resolveSessionTitle(item: QuestionnaireHistoryItemV2DTO, index: number) {
    const named = getString(item.title ?? item.name, '');
    if (named) return normalizeClinicalTextPresentation(named, '');
    const mode = normalizeClinicalTextPresentation(getModeLabel(item.mode, ''), '');
    const status = normalizeClinicalTextPresentation(getStatusLabel(item.status, ''), '');
    if (mode && status) return `${mode} · ${status}`;
    return `Registro ${index + 1}`;
}

function getClinicalSectionText(
    summary: QuestionnaireClinicalSummaryV2DTO | null,
    key: keyof QuestionnaireClinicalNarrativeV2DTO
) {
    const narrativeValue = readOptionalString(summary?.simulated_diagnostic_text?.[key]);
    if (narrativeValue) return narrativeValue;

    const sections = summary?.sections;
    if (Array.isArray(sections)) {
        const section = sections.find((item) => readOptionalString(item.key) === key);
        const sectionContent = readOptionalString(section?.content);
        if (sectionContent) return sectionContent;
    } else if (sections && typeof sections === 'object') {
        const sectionContent = readOptionalString((sections as Record<string, unknown>)[key]);
        if (sectionContent) return sectionContent;
    }

    return null;
}

function collectStructuredDomains(
    summary: QuestionnaireClinicalSummaryV2DTO | null,
    results: QuestionnaireSecureResultsV2DTO | null
) {
    if (Array.isArray(summary?.domains) && summary.domains.length > 0) {
        return summary.domains;
    }

    if (Array.isArray(results?.domains) && results.domains.length > 0) {
        return results.domains;
    }

    return [];
}

function parseCompatibilityFromText(text: string): CompatibilityItem[] {
    return text
        .split(/[;|\n]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item, index) => {
            const match = /^([^:]+):\s*prob(?:abilidad)?\s*=?\s*([0-9]+(?:[.,][0-9]+)?)\s*,?\s*riesgo\s*=?\s*([A-Za-z_áéíóúüñÁÉÍÓÚÜÑ-]+)\.?$/i.exec(item);
            if (!match) return null;
            return {
                key: `legacy-compatibility-${index}`,
                domain: formatDomainLabel(match[1]),
                probability: formatProbability(match[2]),
                risk: formatRiskLabel(match[3])
            } satisfies CompatibilityItem;
        })
        .filter((item): item is CompatibilityItem => Boolean(item));
}

function buildCompatibilityItems(
    summary: QuestionnaireClinicalSummaryV2DTO | null,
    results: QuestionnaireSecureResultsV2DTO | null
) {
    const structuredDomains = collectStructuredDomains(summary, results);
    if (structuredDomains.length > 0) {
        return structuredDomains
            .map((domain, index) => {
                const domainLabel = formatDomainLabel(domain.domain);
                const probability = formatProbability(domain.probability);
                const risk = formatRiskLabel(
                    'risk_level' in domain
                        ? domain.risk_level ?? domain.compatibility_level ?? domain.alert_level
                        : domain.alert_level
                );

                return {
                    key: `${String(domain.domain ?? domainLabel)}-${index}`,
                    domain: domainLabel,
                    probability,
                    risk
                } satisfies CompatibilityItem;
            })
            .filter((item) => item.domain !== 'No disponible');
    }

    const rawText = getClinicalSectionText(summary, 'niveles_de_compatibilidad');
    if (!rawText) return [];
    return parseCompatibilityFromText(normalizeClinicalTextPresentation(rawText, ''));
}

function parseDomainNarrativeItems(sourceText: string) {
    return sourceText
        .split(/[|\n;]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item, index) => {
            const match = /^([^:]+):\s*(.+)$/i.exec(item);
            if (!match) {
                return {
                    key: `generic-${index}`,
                    text: normalizeClinicalTextPresentation(item)
                } satisfies BulletItem;
            }

            return {
                key: `domain-${index}`,
                text: `${formatDomainLabel(match[1])}: ${normalizeClinicalTextPresentation(match[2])}`
            } satisfies BulletItem;
        });
}

function buildIndicatorItems(
    summary: QuestionnaireClinicalSummaryV2DTO | null,
    results: QuestionnaireSecureResultsV2DTO | null
) {
    const structuredDomains = collectStructuredDomains(summary, results);
    const structuredIndicators = structuredDomains
        .map((domain, index) => {
            const mainIndicators =
                'main_indicators' in domain && Array.isArray(domain.main_indicators)
                    ? domain.main_indicators.map((item) => normalizeClinicalTextPresentation(item, '')).filter(Boolean)
                    : [];

            if (mainIndicators.length === 0) return null;
            return {
                key: `indicator-${index}`,
                text: `${formatDomainLabel(domain.domain)}: ${mainIndicators.join(' ')}`
            } satisfies BulletItem;
        })
        .filter((item): item is BulletItem => Boolean(item));

    if (structuredIndicators.length > 0) {
        return structuredIndicators;
    }

    const rawText = getClinicalSectionText(summary, 'indicadores_principales_observados');
    if (!rawText) return [];
    return parseDomainNarrativeItems(normalizeClinicalTextPresentation(rawText, ''));
}

function splitSentences(text: string) {
    return text
        .split(/(?<=[.!?])\s+/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function buildSummaryPresentation(summary: QuestionnaireClinicalSummaryV2DTO | null): SummaryPresentation {
    const rawText = getClinicalSectionText(summary, 'sintesis_general');
    if (!rawText) {
        return {
            bullets: [],
            levelText: null,
            paragraphs: []
        };
    }

    const normalized = normalizeClinicalTextPresentation(rawText, '');
    const sentences = splitSentences(normalized);
    const compatibilitySentence =
        sentences.find((sentence) => /compatibilidad/i.test(sentence) && /\(.+\)/.test(sentence)) ?? null;
    const levelSentence =
        sentences.find((sentence) => /^Nivel global estimado:/i.test(sentence)) ?? null;

    const bullets = compatibilitySentence
        ? Array.from(compatibilitySentence.matchAll(/([A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9_-]+)\s*\(([^)]+)\)/g)).map((match, index) => ({
            key: `summary-${index}`,
            domain: formatDomainLabel(match[1]),
            level: formatCompatibilityLevel(match[2])
        }))
        : [];

    const levelText = levelSentence
        ? normalizeClinicalTextPresentation(levelSentence.replace(/^Nivel global estimado:\s*/i, '').replace(/\.$/, ''))
        : null;

    const paragraphs = sentences.filter((sentence) => sentence !== compatibilitySentence && sentence !== levelSentence);

    return {
        bullets,
        levelText,
        paragraphs
    };
}

function resolveSessionMetadataRows(
    detail: QuestionnaireHistoryDetailV2DTO | null,
    detailSessionId: string | null,
    questionnaireIdForShare: string | null,
    sharePayload: QuestionnaireShareResponseDTO | null
) {
    return buildSafeDisplayRows(
        {
            session_id: detail?.id ?? detailSessionId,
            questionnaire_id: questionnaireIdForShare,
            mode_key: detail?.mode_key ?? null,
            share_code: sharePayload?.share_code ?? null
        },
        {
            includeTechnical: true,
            includeEmpty: false,
            customLabels: {
                session_id: 'ID de sesión',
                questionnaire_id: 'ID de cuestionario',
                mode_key: 'Clave interna de modo',
                share_code: 'Código de acceso compartido'
            }
        }
    );
}

type HistoryDetailLoadResult =
    | {
        ok: true;
        detail: QuestionnaireHistoryDetailV2DTO;
        results: QuestionnaireSecureResultsV2DTO | null;
        summary: QuestionnaireClinicalSummaryV2DTO | null;
        notice: string | null;
    }
    | {
        ok: false;
        error: string;
    };

async function loadHistoryDetail(sessionId: string): Promise<HistoryDetailLoadResult> {
    try {
        const detail = await getQuestionnaireHistoryDetailV2(sessionId);
        if (!canLoadClinicalArtifacts(detail.status)) {
            return {
                ok: true,
                detail,
                results: null,
                summary: null,
                notice: null
            };
        }

        const [resultsResponse, summaryResponse] = await Promise.allSettled([
            getQuestionnaireHistoryResultsV2(sessionId),
            getQuestionnaireClinicalSummaryV2(sessionId)
        ]);

        const results = resultsResponse.status === 'fulfilled' ? resultsResponse.value : null;
        const summary = summaryResponse.status === 'fulfilled' ? summaryResponse.value : null;
        const notice =
            summaryResponse.status === 'fulfilled' || resultsResponse.status !== 'fulfilled'
                ? null
                : 'No fue posible generar el informe orientativo en este momento.';

        return {
            ok: true,
            detail,
            results,
            summary,
            notice
        };
    } catch (requestError) {
        return {
            ok: false,
            error: mapApiErrorToUserMessage(requestError, 'No fue posible cargar el detalle de esta sesión.')
        };
    }
}

function KeyValueRows({
    data,
    exclude = [],
    includeTechnical = false,
    emptyText
}: Readonly<{
    data: Record<string, unknown> | null;
    exclude?: string[];
    includeTechnical?: boolean;
    emptyText: string;
}>) {
    if (!data) return <p>{emptyText}</p>;
    const rows = buildSafeDisplayRows(data, {
        includeTechnical,
        hiddenFields: exclude,
        includeEmpty: false
    });
    if (rows.length === 0) return <p>{emptyText}</p>;

    return (
        <div className="historial-v2-kv-grid">
            {rows.map((row) => (
                <div key={row.key}>
                    <strong>{normalizeClinicalTextPresentation(row.label, row.label)}</strong>
                    <span>{normalizeClinicalTextPresentation(row.value, row.value)}</span>
                </div>
            ))}
        </div>
    );
}

function BulletList({
    title,
    items,
    emptyText
}: Readonly<{
    title: string;
    items: BulletItem[];
    emptyText: string;
}>) {
    return (
        <div className="historial-v2-section">
            <h3>{title}</h3>
            {items.length === 0 ? (
                <p>{emptyText}</p>
            ) : (
                <ul className="historial-v2-bullet-list">
                    {items.map((item) => (
                        <li key={item.key}>{item.text}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export function HistorialBase({ role }: Readonly<HistorialBaseProps>) {
    const {
        items,
        page,
        pageSize,
        total,
        pages,
        statusFilter,
        loading,
        error,
        setPage,
        setStatusFilter,
        changePageSize,
        reload
    } = useQuestionnaireHistoryV2();

    const [detailSessionId, setDetailSessionId] = useState<string | null>(null);
    const [detailPayload, setDetailPayload] = useState<QuestionnaireHistoryDetailV2DTO | null>(null);
    const [resultsPayload, setResultsPayload] = useState<QuestionnaireSecureResultsV2DTO | null>(null);
    const [clinicalSummaryPayload, setClinicalSummaryPayload] = useState<QuestionnaireClinicalSummaryV2DTO | null>(null);
    const [pdfPayload, setPdfPayload] = useState<QuestionnairePdfInfoV2DTO | null>(null);
    const [sharePayload, setSharePayload] = useState<QuestionnaireShareResponseDTO | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [detailNotice, setDetailNotice] = useState<string | null>(null);

    const [newTag, setNewTag] = useState('');
    const [newTagColor, setNewTagColor] = useState(defaultTagColor);
    const [newTagVisibility, setNewTagVisibility] = useState<QuestionnaireTagVisibility>('private');

    const [tagWorking, setTagWorking] = useState(false);
    const [shareWorking, setShareWorking] = useState(false);
    const [pdfWorking, setPdfWorking] = useState(false);

    const [tagError, setTagError] = useState<string | null>(null);
    const [tagNotice, setTagNotice] = useState<string | null>(null);
    const [shareError, setShareError] = useState<string | null>(null);
    const [shareNotice, setShareNotice] = useState<string | null>(null);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const [pdfNotice, setPdfNotice] = useState<string | null>(null);

    const title = 'Historial de cuestionarios';
    const historyContextLabel = role === 'psicologo' ? 'psicólogo' : 'padre o tutor';
    const totalPages = Math.max(1, pages);
    const currentPage = Math.min(Math.max(page, 1), totalPages);
    const showFrom = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const showTo = total === 0 ? 0 : Math.min(currentPage * pageSize, total);
    const tags = useMemo(() => detailPayload?.tags ?? [], [detailPayload]);

    const questionnaireIdForShare = useMemo(
        () => resolveQuestionnaireId(detailPayload, sharePayload),
        [detailPayload, sharePayload]
    );

    const internalReferenceRows = useMemo(
        () => resolveSessionMetadataRows(detailPayload, detailSessionId, questionnaireIdForShare, sharePayload),
        [detailPayload, detailSessionId, questionnaireIdForShare, sharePayload]
    );

    const shareLink = useMemo(
        () => sharePayload?.shared_url ?? sharePayload?.shared_path ?? sharePayload?.url ?? null,
        [sharePayload]
    );

    const pdfStatusText = useMemo(() => getPdfStatusLabel(pdfPayload?.status), [pdfPayload]);
    const clinicalRisk = useMemo(
        () => getRiskLevelPresentation(clinicalSummaryPayload?.overall_risk_level ?? null),
        [clinicalSummaryPayload?.overall_risk_level]
    );
    const clinicalDisclaimer = useMemo(
        () => normalizeClinicalTextPresentation(getSafeClinicalDisclaimer(clinicalSummaryPayload)),
        [clinicalSummaryPayload]
    );
    const clinicalComorbiditySummary = useMemo(
        () => normalizeClinicalTextPresentation(getClinicalComorbiditySummary(clinicalSummaryPayload), ''),
        [clinicalSummaryPayload]
    );

    const compatibilityItems = useMemo(
        () => buildCompatibilityItems(clinicalSummaryPayload, resultsPayload),
        [clinicalSummaryPayload, resultsPayload]
    );
    const indicatorItems = useMemo(
        () => buildIndicatorItems(clinicalSummaryPayload, resultsPayload),
        [clinicalSummaryPayload, resultsPayload]
    );
    const summaryPresentation = useMemo(
        () => buildSummaryPresentation(clinicalSummaryPayload),
        [clinicalSummaryPayload]
    );

    const impactText = useMemo(
        () => normalizeClinicalTextPresentation(getClinicalSectionText(clinicalSummaryPayload, 'impacto_funcional')),
        [clinicalSummaryPayload]
    );
    const recommendationText = useMemo(
        () => normalizeClinicalTextPresentation(getClinicalSectionText(clinicalSummaryPayload, 'recomendacion_profesional')),
        [clinicalSummaryPayload]
    );
    const clarificationText = useMemo(
        () => normalizeClinicalTextPresentation(getClinicalSectionText(clinicalSummaryPayload, 'aclaracion_importante')),
        [clinicalSummaryPayload]
    );
    const compatibilityFallbackText = useMemo(
        () => normalizeClinicalTextPresentation(getClinicalSectionText(clinicalSummaryPayload, 'niveles_de_compatibilidad'), ''),
        [clinicalSummaryPayload]
    );

    const historyRowsContent = (() => {
        if (loading) {
            return <div className="historial-v2-empty">Cargando historial...</div>;
        }

        if (items.length === 0) {
            return <div className="historial-v2-empty">No hay sesiones para mostrar.</div>;
        }

        return items.map((item: QuestionnaireHistoryItemV2DTO, index) => {
            const sessionTitle = resolveSessionTitle(item, index);
            return (
                <div className="historial-v2-row" key={item.id}>
                    <div title={sessionTitle}>{sessionTitle}</div>
                    <div>{normalizeClinicalTextPresentation(getStatusLabel(item.status), '--')}</div>
                    <div>{normalizeClinicalTextPresentation(getModeLabel(item.mode), '--')}</div>
                    <div>{normalizeClinicalTextPresentation(getRoleLabel(item.role), '--')}</div>
                    <div>{formatDateTimeEsCO(item.created_at)}</div>
                    <div>{formatDateTimeEsCO(item.updated_at)}</div>
                    <div className="historial-v2-actions">
                        <button type="button" className="historial-v2-btn" onClick={() => handleOpenDetail(item.id)}>
                            Ver
                        </button>
                    </div>
                </div>
            );
        });
    })();

    const resetActionMessages = () => {
        setTagError(null);
        setTagNotice(null);
        setShareError(null);
        setShareNotice(null);
        setPdfError(null);
        setPdfNotice(null);
    };

    const openDetail = async (sessionId: string) => {
        if (!sessionId || sessionId.trim().length === 0) {
            setDetailError('No se encontró una referencia válida para esta sesión.');
            return;
        }

        setDetailSessionId(sessionId);
        setDetailLoading(true);
        setDetailError(null);
        setDetailNotice(null);
        setSharePayload(null);
        setPdfPayload(null);
        setClinicalSummaryPayload(null);
        resetActionMessages();

        const detailLoad = await loadHistoryDetail(sessionId);
        if (!detailLoad.ok) {
            setDetailError(detailLoad.error);
            setDetailPayload(null);
            setResultsPayload(null);
            setClinicalSummaryPayload(null);
            setDetailLoading(false);
            return;
        }

        setDetailPayload(detailLoad.detail);
        setResultsPayload(detailLoad.results);
        setClinicalSummaryPayload(detailLoad.summary);
        setDetailNotice(detailLoad.notice);
        setDetailLoading(false);
    };

    const closeDetail = () => {
        setDetailSessionId(null);
        setDetailPayload(null);
        setResultsPayload(null);
        setClinicalSummaryPayload(null);
        setPdfPayload(null);
        setSharePayload(null);
        setDetailLoading(false);
        setDetailError(null);
        setDetailNotice(null);
        setNewTag('');
        setNewTagColor(defaultTagColor);
        setNewTagVisibility('private');
        setTagWorking(false);
        setShareWorking(false);
        setPdfWorking(false);
        resetActionMessages();
    };

    const handleOpenDetail = (nextSessionId: string) => {
        runHistoryTask(() => openDetail(nextSessionId));
    };

    const refreshDetailAfterTagChange = async () => {
        if (!detailSessionId) return;
        const refreshed = await getQuestionnaireHistoryDetailV2(detailSessionId);
        setDetailPayload(refreshed);
        await reload();
    };

    const handleAddTag = async () => {
        if (!detailSessionId || newTag.trim().length === 0) return;
        setTagWorking(true);
        setTagError(null);
        setTagNotice(null);
        try {
            await addQuestionnaireHistoryTagV2(detailSessionId, {
                tag: newTag.trim(),
                color: normalizeTagColor(newTagColor),
                visibility: newTagVisibility
            });
            await refreshDetailAfterTagChange();
            setNewTag('');
            setNewTagColor(defaultTagColor);
            setTagNotice('Etiqueta agregada correctamente.');
        } catch (actionError) {
            setTagError(buildActionErrorMessage(actionError, 'No fue posible agregar la etiqueta.'));
        } finally {
            setTagWorking(false);
        }
    };

    const handleDeleteTag = async (tagId: string) => {
        if (!detailSessionId) return;
        setTagWorking(true);
        setTagError(null);
        setTagNotice(null);
        try {
            await deleteQuestionnaireHistoryTagV2(detailSessionId, tagId);
            await refreshDetailAfterTagChange();
            setTagNotice('Etiqueta eliminada.');
        } catch (actionError) {
            setTagError(buildActionErrorMessage(actionError, 'No fue posible eliminar la etiqueta.'));
        } finally {
            setTagWorking(false);
        }
    };

    const handleGenerateShare = async () => {
        if (!detailSessionId) return;
        setShareWorking(true);
        setShareError(null);
        setShareNotice(null);
        try {
            const payload = await shareQuestionnaireHistoryV2(detailSessionId, { ...DEFAULT_SHARE_PAYLOAD });
            setSharePayload(payload);
            setShareNotice('Enlace generado correctamente.');
        } catch (actionError) {
            setShareError(buildActionErrorMessage(actionError, 'No se pudo completar la acción. Intenta nuevamente.'));
        } finally {
            setShareWorking(false);
        }
    };

    const handleDownloadPdf = async () => {
        if (!detailSessionId) return;
        setPdfWorking(true);
        setPdfError(null);
        setPdfNotice('Preparando PDF...');
        try {
            await generateQuestionnaireHistoryPdfV2(detailSessionId);
            const pdfInfo = await getQuestionnaireHistoryPdfV2(detailSessionId);
            setPdfPayload(pdfInfo);
            const download = await downloadQuestionnaireHistoryPdfV2(detailSessionId);
            downloadBlob(download.blob, pdfInfo.filename ?? download.filename);
            setPdfNotice('Descarga iniciada.');
        } catch (actionError) {
            setPdfError(buildActionErrorMessage(actionError, 'No se pudo preparar el PDF. Intenta nuevamente.'));
            setPdfNotice(null);
        } finally {
            setPdfWorking(false);
        }
    };

    const handleCopyShareLink = async () => {
        if (!shareLink) {
            setShareError('Todavía no hay un enlace disponible para copiar.');
            return;
        }

        try {
            await navigator.clipboard.writeText(shareLink);
            setShareError(null);
            setShareNotice('Enlace copiado.');
        } catch {
            setShareError('No fue posible copiar el enlace automáticamente.');
        }
    };

    return (
        <div className="plataforma-view">
            <section className="historial-v2" aria-label={`Historial de cuestionarios para ${historyContextLabel}`}>
                <div className="historial-v2-header">
                    <h1>{title}</h1>
                </div>

                <div className="historial-v2-divider" />

                <div className="historial-v2-controls">
                    <label>
                        Estado
                        <CustomSelect
                            value={statusFilter}
                            options={statusOptions}
                            onChange={setStatusFilter}
                            ariaLabel="Filtrar historial por estado"
                        />
                    </label>
                </div>

                {error ? <div className="historial-v2-alert error">{error}</div> : null}

                <div className="historial-v2-table">
                    <div className="historial-v2-head">
                        <div>Sesión</div>
                        <div>Estado</div>
                        <div>Modo</div>
                        <div>Rol</div>
                        <div>Creado</div>
                        <div>Actualizado</div>
                        <div>Acciones</div>
                    </div>
                    <div className="historial-v2-body">{historyRowsContent}</div>
                </div>

                <div className="historial-v2-pagination">
                    <div>Mostrando {showFrom}-{showTo} de {total}</div>
                    <div className="historial-v2-pagination-right">
                        <label>
                            Tamaño
                            <CustomSelect
                                value={String(pageSize)}
                                options={pageSizeOptions}
                                onChange={(value) => changePageSize(Number(value))}
                                ariaLabel="Cambiar tamaño de página de historial"
                            />
                        </label>
                        <button
                            type="button"
                            className="historial-v2-page-btn"
                            onClick={() => setPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage <= 1}
                            aria-label="Página anterior"
                        >
                            <span className="historial-v2-page-arrow" aria-hidden="true">‹</span>
                        </button>
                        <span>Página {currentPage} de {totalPages}</span>
                        <button
                            type="button"
                            className="historial-v2-page-btn"
                            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage >= totalPages}
                            aria-label="Página siguiente"
                        >
                            <span className="historial-v2-page-arrow" aria-hidden="true">›</span>
                        </button>
                    </div>
                </div>
            </section>

            <Modal isOpen={detailSessionId !== null} onClose={closeDetail}>
                <div className="historial-v2-modal">
                    <h2>Detalle de sesión</h2>
                    {detailLoading ? <div className="historial-v2-empty">Cargando detalle...</div> : null}
                    {detailError ? <div className="historial-v2-alert error">{detailError}</div> : null}
                    {detailNotice ? <div className="historial-v2-alert success">{detailNotice}</div> : null}

                    {!detailLoading && detailPayload ? (
                        <>
                            <div className="historial-v2-detail-list">
                                <div className="historial-v2-detail-item">
                                    <strong>Estado</strong>
                                    <span>{normalizeClinicalTextPresentation(getStatusLabel(getString(detailPayload.status, '')), '--')}</span>
                                </div>
                                <div className="historial-v2-detail-item">
                                    <strong>Modo de evaluación</strong>
                                    <span>{normalizeClinicalTextPresentation(getModeLabel(getString(detailPayload.mode, '')), '--')}</span>
                                </div>
                                <div className="historial-v2-detail-item">
                                    <strong>Perfil que respondió</strong>
                                    <span>{normalizeClinicalTextPresentation(getRoleLabel(getString(detailPayload.role, '')), '--')}</span>
                                </div>
                                <div className="historial-v2-detail-item">
                                    <strong>Última actualización</strong>
                                    <span>{formatDateTimeEsCO(detailPayload.updated_at)}</span>
                                </div>
                            </div>

                            <div className="historial-v2-warning">
                                Este resultado es orientativo y sirve como apoyo de alerta temprana; no constituye diagnóstico clínico definitivo.
                            </div>

                            <div className="historial-v2-section">
                                <h3>Diagnóstico clínico orientativo</h3>
                                {clinicalSummaryPayload ? (
                                    <div className="historial-v2-detail-list">
                                        <div className="historial-v2-detail-item">
                                            <strong>Nivel de alerta</strong>
                                            <span>{normalizeClinicalTextPresentation(clinicalRisk.label, 'No disponible')}</span>
                                        </div>
                                        <div className="historial-v2-detail-item">
                                            <strong>Generado</strong>
                                            <span>{formatDateTimeEsCO(clinicalSummaryPayload.generated_at)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p>No fue posible cargar el informe orientativo completo para esta sesión.</p>
                                )}

                                {clinicalComorbiditySummary ? (
                                    <div className="historial-v2-warning">
                                        <strong>Posible coexistencia de señales.</strong> {clinicalComorbiditySummary}
                                    </div>
                                ) : null}
                            </div>

                            <div className="historial-v2-section">
                                <h3>Síntesis general</h3>
                                {summaryPresentation.bullets.length > 0 ? (
                                    <>
                                        <p className="historial-v2-section-label">Mayor compatibilidad observada:</p>
                                        <ul className="historial-v2-bullet-list">
                                            {summaryPresentation.bullets.map((item) => (
                                                <li key={item.key}>{item.domain}: {item.level}.</li>
                                            ))}
                                        </ul>
                                    </>
                                ) : null}
                                {summaryPresentation.levelText ? (
                                    <p className="historial-v2-text-block">
                                        <strong>Nivel global estimado:</strong> {summaryPresentation.levelText}.
                                    </p>
                                ) : null}
                                {summaryPresentation.paragraphs.length > 0 ? (
                                    summaryPresentation.paragraphs.map((paragraph, index) => (
                                        <p className="historial-v2-text-block" key={`summary-paragraph-${index}`}>
                                            {paragraph}
                                        </p>
                                    ))
                                ) : summaryPresentation.bullets.length === 0 ? (
                                    <p>No se recibió contenido para esta sección en el informe actual.</p>
                                ) : null}
                            </div>

                            <div className="historial-v2-section">
                                <h3>Niveles de compatibilidad</h3>
                                {compatibilityItems.length > 0 ? (
                                    <ul className="historial-v2-bullet-list">
                                        {compatibilityItems.map((item) => (
                                            <li key={item.key}>
                                                {item.domain}: probabilidad {item.probability}, riesgo {item.risk}.
                                            </li>
                                        ))}
                                    </ul>
                                ) : compatibilityFallbackText ? (
                                    <p className="historial-v2-text-block">{compatibilityFallbackText}</p>
                                ) : (
                                    <p>No se recibió información estructurada de compatibilidad.</p>
                                )}
                            </div>

                            <BulletList
                                title="Indicadores principales observados"
                                items={indicatorItems}
                                emptyText="No se recibieron indicadores estructurados para esta sesión."
                            />

                            <div className="historial-v2-section">
                                <h3>Impacto funcional</h3>
                                <p className="historial-v2-text-block">{impactText}</p>
                            </div>

                            <div className="historial-v2-section">
                                <h3>Recomendación profesional</h3>
                                <p className="historial-v2-text-block">{recommendationText}</p>
                            </div>

                            <div className="historial-v2-section">
                                <h3>Aclaración importante</h3>
                                <p className="historial-v2-text-block">{clarificationText}</p>
                                <p className="historial-v2-helper-text">{clinicalDisclaimer}</p>
                            </div>

                            <div className="historial-v2-section">
                                <h3>Resultados estructurados complementarios</h3>
                                <KeyValueRows
                                    data={toRecord(resultsPayload?.result ?? resultsPayload)}
                                    exclude={hiddenResultFields}
                                    emptyText="Sin resultados estructurados adicionales."
                                />
                            </div>

                            {internalReferenceRows.length > 0 ? (
                                <div className="historial-v2-section">
                                    <h3>Referencia interna</h3>
                                    <div className="historial-v2-kv-grid">
                                        {internalReferenceRows.map((row) => (
                                            <div key={row.key}>
                                                <strong>{normalizeClinicalTextPresentation(row.label, row.label)}</strong>
                                                <span>{row.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            <div className="historial-v2-section">
                                <h3>Etiquetas</h3>
                                {tagError ? <div className="historial-v2-inline-feedback error">{tagError}</div> : null}
                                {tagNotice ? <div className="historial-v2-inline-feedback success">{tagNotice}</div> : null}

                                {tags.length === 0 ? (
                                    <p>Sin etiquetas.</p>
                                ) : (
                                    <div className="historial-v2-tags">
                                        {tags.map((tag) => {
                                            const tagName = normalizeClinicalTextPresentation(tag.label ?? tag.tag, '--');
                                            const tagId = resolveTagId(tag);
                                            const tagColor = normalizeTagColor(tag.color);
                                            const visibilityLabel = normalizeClinicalTextPresentation(
                                                tag.visibility_label ?? getTagVisibilityLabel(tag.visibility),
                                                '--'
                                            );
                                            const tagKey = tagId || `${tagName}-${visibilityLabel}-${tagColor}`;

                                            return (
                                                <div
                                                    className="historial-v2-tag"
                                                    key={tagKey}
                                                    style={{ borderLeftColor: tagColor }}
                                                >
                                                    <span className="historial-v2-tag-name">{tagName}</span>
                                                    <span className="historial-v2-tag-meta">{visibilityLabel}</span>
                                                    {tagId.length > 0 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => { runHistoryTask(() => handleDeleteTag(tagId)); }}
                                                            disabled={tagWorking}
                                                        >
                                                            Eliminar
                                                        </button>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="historial-v2-tag-form">
                                    <input
                                        type="text"
                                        placeholder="Etiqueta"
                                        value={newTag}
                                        onChange={(event) => setNewTag(event.target.value)}
                                    />
                                    <CustomSelect
                                        value={newTagVisibility}
                                        options={tagVisibilityOptions}
                                        onChange={(value) => setNewTagVisibility(value as QuestionnaireTagVisibility)}
                                        ariaLabel="Visibilidad de etiqueta"
                                    />
                                    <div className="historial-v2-color-palette" role="radiogroup" aria-label="Color de etiqueta">
                                        {tagColorOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                className={`historial-v2-color-swatch ${newTagColor === option.value ? 'is-selected' : ''}`}
                                                role="radio"
                                                aria-checked={newTagColor === option.value}
                                                aria-label={option.label}
                                                title={option.label}
                                                style={{ backgroundColor: option.value }}
                                                onClick={() => setNewTagColor(option.value)}
                                            />
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        className="historial-v2-btn"
                                        onClick={() => { runHistoryTask(handleAddTag); }}
                                        disabled={tagWorking || newTag.trim().length === 0}
                                    >
                                        {tagWorking ? 'Guardando...' : 'Agregar'}
                                    </button>
                                </div>
                            </div>

                            <div className="historial-v2-section">
                                <h3>Compartir resultados</h3>
                                <div className="historial-v2-actions-card">
                                    <p className="historial-v2-helper-text">
                                        Genera un enlace válido por 7 días para compartir este resultado. El enlace podrá usarse hasta 10 veces.
                                    </p>
                                    {shareError ? <div className="historial-v2-inline-feedback error">{shareError}</div> : null}
                                    {shareNotice ? <div className="historial-v2-inline-feedback success">{shareNotice}</div> : null}
                                    <div className="historial-v2-section-actions">
                                        <button
                                            type="button"
                                            className="historial-v2-btn"
                                            onClick={() => { runHistoryTask(handleGenerateShare); }}
                                            disabled={shareWorking}
                                        >
                                            {shareWorking ? 'Generando enlace...' : 'Generar enlace para compartir'}
                                        </button>
                                        {shareLink ? (
                                            <button type="button" className="historial-v2-btn" onClick={() => { runHistoryTask(handleCopyShareLink); }}>
                                                Copiar enlace
                                            </button>
                                        ) : null}
                                    </div>

                                    {shareLink ? (
                                        <div className="historial-v2-share-link-box">
                                            <strong>Enlace disponible</strong>
                                            <a href={shareLink} target="_blank" rel="noreferrer">
                                                {shareLink}
                                            </a>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <div className="historial-v2-section">
                                <h3>Documento PDF</h3>
                                <div className="historial-v2-actions-card">
                                    <p className="historial-v2-helper-text">
                                        Estado actual: <strong>{pdfStatusText}</strong>
                                    </p>
                                    {pdfNotice ? <div className="historial-v2-inline-feedback success">{pdfNotice}</div> : null}
                                    {pdfError ? <div className="historial-v2-inline-feedback error">{pdfError}</div> : null}
                                    <div className="historial-v2-section-actions">
                                        <button
                                            type="button"
                                            className="historial-v2-btn"
                                            onClick={() => { runHistoryTask(handleDownloadPdf); }}
                                            disabled={pdfWorking}
                                        >
                                            {pdfWorking ? 'Preparando PDF...' : 'Descargar PDF'}
                                        </button>
                                    </div>
                                    {pdfPayload?.generated_at ? (
                                        <p className="historial-v2-helper-text">
                                            Última generación: {formatDateTimeEsCO(pdfPayload.generated_at)}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        </>
                    ) : null}

                    <div className="historial-v2-modal-actions">
                        <button type="button" className="historial-v2-btn" onClick={closeDetail}>
                            Cerrar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
