import { getClinicalComorbiditySummary, getRiskLevelPresentation } from '../../services/questionnaires/clinicalSummary';
import type {
    QuestionnaireClinicalNarrativeV2DTO,
    QuestionnaireClinicalSummaryV2DTO,
    QuestionnaireHistoryDetailV2DTO,
    QuestionnaireSecureResultsV2DTO
} from '../../services/questionnaires/questionnaires.types';
import { formatDateTimeEsCO, getModeLabel, getRoleLabel, getStatusLabel } from './naturalLanguage';

export interface ReportDomainItem {
    key: string;
    domainLabel: string;
    probabilityText: string;
    riskText: string;
    compatibilityText: string;
    confidenceText: string | null;
}

export interface ReportBulletItem {
    key: string;
    text: string;
}

export interface ReportSummaryBlocks {
    bullets: Array<{ key: string; domain: string; level: string }>;
    levelText: string | null;
    paragraphs: string[];
}

export interface ReportViewModel {
    title: string;
    questionnaireId: string;
    sessionId: string;
    generatedAt: string;
    modeLabel: string;
    roleLabel: string;
    statusLabel: string;
    version: string;
    overallRiskLabel: string;
    summaryBlocks: ReportSummaryBlocks;
    domains: ReportDomainItem[];
    compatibilityItems: ReportBulletItem[];
    indicators: ReportBulletItem[];
    functionalImpact: string;
    professionalRecommendation: string;
    comorbidityText: string;
    clarification: string;
    disclaimer: string;
    answersAvailabilityNote: string;
}

const DOMAIN_LABELS: Record<string, string> = {
    adhd: 'TDAH',
    adhd_combined: 'TDAH',
    conduct: 'Conducta',
    conduct_disorder: 'Conducta',
    conduct_problem: 'Conducta',
    elimination: 'Eliminación',
    elimination_disorder: 'Eliminación',
    anxiety: 'Ansiedad',
    anxiety_disorder: 'Ansiedad',
    depression: 'Depresión',
    depressive_disorder: 'Depresión'
};

const NON_TEXT_PATTERNS = [/https?:\/\//i, /^[A-Za-z0-9_-]{6,}$/];
const TECHNICAL_PREFIXES = [
    'adhd_hypimp',
    'adhd_inatt',
    'dmdd',
    'odd',
    'anx',
    'depr',
    'conduct',
    'elimination',
    'enuresis',
    'encopresis',
    'outbursts',
    'frequency_per_week'
];

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
    [/ni\?o/gi, 'niño'],
    [/ni\?a/gi, 'niña']
];

function escapeHtml(value: string) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function readOptionalString(value: unknown) {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function shouldPreserveRawText(value: string) {
    return NON_TEXT_PATTERNS.some((pattern) => pattern.test(value));
}

function replaceKnownDomainsInText(text: string) {
    return Object.entries(DOMAIN_LABELS).sort((left, right) => right[0].length - left[0].length).reduce(
        (current, [domainKey, label]) =>
            current.replace(new RegExp(`\\b${domainKey.replace(/_/g, '[_-]')}\\b`, 'gi'), label),
        text
    );
}

function getSectionText(
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

function splitSentences(text: string) {
    return text
        .split(/(?<=[.!?])\s+/)
        .map((item) => item.trim())
        .filter(Boolean);
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

export function formatDomainLabel(domain: unknown): string {
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

export function normalizeMojibakeText(value: string) {
    if (!value.trim() || shouldPreserveRawText(value)) return value;

    let next = value;
    for (const [pattern, replacement] of TEXT_REPLACEMENTS) {
        next = next.replace(pattern, replacement);
    }

    next = replaceKnownDomainsInText(next);
    return next.replace(/\s+/g, ' ').trim();
}

export function normalizeClinicalTextPresentation(value: unknown, fallback = 'No disponible') {
    if (typeof value !== 'string' || value.trim().length === 0) return fallback;
    return normalizeMojibakeText(value);
}

export function formatProbability(value: unknown) {
    const numeric =
        typeof value === 'number'
            ? value
            : typeof value === 'string' && value.trim().length > 0
                ? Number(value.replace(',', '.'))
                : Number.NaN;

    if (!Number.isFinite(numeric)) return 'No disponible';

    const percentValue = numeric <= 1 ? numeric * 100 : numeric;
    const rounded =
        Math.abs(percentValue - Math.round(percentValue)) < 0.05
            ? Math.round(percentValue)
            : Number(percentValue.toFixed(1));

    return `${new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: Number.isInteger(rounded) ? 0 : 1,
        maximumFractionDigits: 1
    }).format(rounded)}%`;
}

export function formatRiskLabel(value: unknown) {
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
        unknown: 'no disponible'
    };

    if (!normalized) return 'no disponible';
    return labels[normalized] ?? normalizeClinicalTextPresentation(value, 'no disponible').toLowerCase();
}

export function formatCompatibilityLevel(value: unknown) {
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

export function isTechnicalFeatureToken(text: string): boolean {
    const normalized = text.trim().toLowerCase();
    if (!normalized) return false;
    if (/^[a-z]+_[a-z0-9]+_/i.test(normalized)) return true;
    if (/^[a-z0-9]+(?:_[a-z0-9]+){2,}(?::\s*-?\d+(?:\.\d+)?)?$/i.test(normalized)) return true;
    if (TECHNICAL_PREFIXES.some((prefix) => normalized.includes(prefix))) return true;
    return false;
}

export function sanitizeClinicalIndicatorText(text: string): string | null {
    const normalized = normalizeClinicalTextPresentation(text, '').trim();
    if (!normalized) return null;

    const tokens = normalized.split(/\s+/);
    const technicalTokens = tokens.filter((token) => isTechnicalFeatureToken(token));

    if (technicalTokens.length === 0) {
        return normalized;
    }

    const metricValues = Array.from(normalized.matchAll(/:\s*(-?\d+(?:\.\d+)?)/g)).map((match) => Number(match[1]));
    if (metricValues.length > 0 && metricValues.every((value) => Number.isFinite(value) && Math.abs(value) <= 0.1)) {
        return 'No se observan indicadores directos relevantes en las respuestas visibles para este dominio.';
    }

    const cleaned = normalized
        .replace(/\b[a-z]+(?:_[a-z0-9]+){2,}\b(?::\s*-?\d+(?:\.\d+)?)?/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (cleaned.length >= 12 && !isTechnicalFeatureToken(cleaned)) {
        return cleaned;
    }

    return 'No hay indicadores clínicos adicionales disponibles para mostrar.';
}

export function parseDomainMetricList(text: string): ReportDomainItem[] {
    return normalizeClinicalTextPresentation(text, '')
        .split(/[;|\n]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map<ReportDomainItem | null>((item, index) => {
            const match = /^([^:]+):\s*prob(?:abilidad)?\s*=?\s*([0-9]+(?:[.,][0-9]+)?)\s*,?\s*riesgo\s*=?\s*([A-Za-z_áéíóúüñÁÉÍÓÚÜÑ-]+)\.?$/i.exec(item);
            if (!match) return null;

            return {
                key: `legacy-domain-${index}`,
                domainLabel: formatDomainLabel(match[1]),
                probabilityText: formatProbability(match[2]),
                riskText: formatRiskLabel(match[3]),
                compatibilityText: formatCompatibilityLevel(match[3]),
                confidenceText: null
            } satisfies ReportDomainItem;
        })
        .filter((item): item is ReportDomainItem => Boolean(item));
}

function buildDomainItems(
    summary: QuestionnaireClinicalSummaryV2DTO | null,
    results: QuestionnaireSecureResultsV2DTO | null
) {
    const structured = collectStructuredDomains(summary, results);
    if (structured.length > 0) {
        return structured.map((domain, index) => {
            const confidencePct =
                typeof domain.confidence_pct === 'number' || typeof domain.confidence_pct === 'string'
                    ? formatProbability(domain.confidence_pct)
                    : null;
            const riskValue =
                'risk_level' in domain
                    ? domain.risk_level ?? domain.compatibility_level ?? domain.alert_level
                    : domain.alert_level;

            return {
                key: `${String(domain.domain ?? index)}-${index}`,
                domainLabel: formatDomainLabel(domain.domain),
                probabilityText: formatProbability(domain.probability),
                riskText: formatRiskLabel(riskValue),
                compatibilityText: formatCompatibilityLevel(
                    'compatibility_level' in domain ? domain.compatibility_level : domain.alert_level
                ),
                confidenceText: confidencePct && confidencePct !== 'No disponible' ? confidencePct : null
            } satisfies ReportDomainItem;
        });
    }

    const legacyText = getSectionText(summary, 'niveles_de_compatibilidad');
    return legacyText ? parseDomainMetricList(legacyText) : [];
}

function buildCompatibilityItems(domains: ReportDomainItem[]) {
    return domains.map((domain) => ({
        key: domain.key,
        text: `${domain.domainLabel}: probabilidad ${domain.probabilityText}, riesgo ${domain.riskText}.`
    }));
}

function buildIndicators(
    summary: QuestionnaireClinicalSummaryV2DTO | null,
    results: QuestionnaireSecureResultsV2DTO | null
) {
    const narrativeIndicators = getSectionText(summary, 'indicadores_principales_observados');
    if (narrativeIndicators) {
        const parsed = normalizeClinicalTextPresentation(narrativeIndicators, '')
            .split(/[|\n;]+/)
            .map((item) => item.trim())
            .filter(Boolean)
            .map((item, index) => {
                const match = /^([^:]+):\s*(.+)$/i.exec(item);
                if (!match) {
                    const sanitized = sanitizeClinicalIndicatorText(item);
                    return sanitized ? { key: `narrative-${index}`, text: sanitized } : null;
                }

                const sanitized = sanitizeClinicalIndicatorText(match[2]);
                return {
                    key: `narrative-${index}`,
                    text: `${formatDomainLabel(match[1])}: ${sanitized ?? 'No hay indicadores clínicos adicionales disponibles para este dominio.'}`
                } satisfies ReportBulletItem;
            })
            .filter((item): item is ReportBulletItem => Boolean(item));

        if (parsed.length > 0) return parsed;
    }

    const structured = collectStructuredDomains(summary, results);
    if (structured.length > 0) {
        return structured.map((domain, index) => {
            const domainLabel = formatDomainLabel(domain.domain);
            const mainIndicators =
                'main_indicators' in domain && Array.isArray(domain.main_indicators)
                    ? domain.main_indicators
                        .map((item) => sanitizeClinicalIndicatorText(String(item)))
                        .filter((item): item is string => Boolean(item))
                    : [];

            const resultSummary =
                'result_summary' in domain ? sanitizeClinicalIndicatorText(String(domain.result_summary ?? '')) : null;

            const text =
                mainIndicators.join(' ') ||
                resultSummary ||
                'No hay indicadores clínicos adicionales disponibles para este dominio.';

            return {
                key: `structured-${index}`,
                text: `${domainLabel}: ${text}`
            } satisfies ReportBulletItem;
        });
    }

    return [];
}

function buildSummaryBlocks(summary: QuestionnaireClinicalSummaryV2DTO | null): ReportSummaryBlocks {
    const rawText = getSectionText(summary, 'sintesis_general');
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

function buildComorbidityText(summary: QuestionnaireClinicalSummaryV2DTO | null) {
    const rawText = getClinicalComorbiditySummary(summary);
    return normalizeClinicalTextPresentation(rawText, 'No se detecta una señal dominante de coexistencia elevada en esta evaluación.');
}

export function buildReportViewModel({
    session,
    results,
    clinicalSummary
}: {
    session: QuestionnaireHistoryDetailV2DTO | null;
    results: QuestionnaireSecureResultsV2DTO | null;
    clinicalSummary: QuestionnaireClinicalSummaryV2DTO | null;
}): ReportViewModel {
    const title = 'Informe orientativo de resultados CognIA';
    const domains = buildDomainItems(clinicalSummary, results);
    const compatibilityItems = buildCompatibilityItems(domains);
    const indicators = buildIndicators(clinicalSummary, results);
    const summaryBlocks = buildSummaryBlocks(clinicalSummary);
    const modeLabel = normalizeClinicalTextPresentation(getModeLabel(session?.mode ?? '', 'No disponible'));
    const roleLabel = normalizeClinicalTextPresentation(getRoleLabel(session?.role ?? '', 'No disponible'));
    const statusLabel = normalizeClinicalTextPresentation(getStatusLabel(session?.status ?? '', 'No disponible'));
    const overallRiskLabel = normalizeClinicalTextPresentation(
        getRiskLevelPresentation(clinicalSummary?.overall_risk_level ?? null).label,
        'No disponible'
    );
    const fallbackRecommendation = normalizeClinicalTextPresentation(
        results?.result?.operational_recommendation,
        'No se recibió una recomendación operativa adicional.'
    );

    return {
        title,
        questionnaireId: readOptionalString(session?.questionnaire_id) ?? 'No disponible',
        sessionId: readOptionalString(session?.id) ?? readOptionalString(session?.session_id) ?? 'No disponible',
        generatedAt: formatDateTimeEsCO(clinicalSummary?.generated_at ?? session?.updated_at, 'No disponible'),
        modeLabel,
        roleLabel,
        statusLabel,
        version: normalizeClinicalTextPresentation(readOptionalString(session?.version) ?? 'No disponible'),
        overallRiskLabel,
        summaryBlocks,
        domains,
        compatibilityItems,
        indicators,
        functionalImpact: normalizeClinicalTextPresentation(
            getSectionText(clinicalSummary, 'impacto_funcional'),
            'No se recibió una descripción de impacto funcional.'
        ),
        professionalRecommendation: normalizeClinicalTextPresentation(
            getSectionText(clinicalSummary, 'recomendacion_profesional') ?? fallbackRecommendation,
            fallbackRecommendation
        ),
        comorbidityText: buildComorbidityText(clinicalSummary),
        clarification: normalizeClinicalTextPresentation(
            getSectionText(clinicalSummary, 'aclaracion_importante'),
            'No se recibió una aclaración adicional para este resultado.'
        ),
        disclaimer: normalizeClinicalTextPresentation(
            clinicalSummary?.disclaimer,
            'Este reporte no reemplaza evaluación clínica, entrevista, historia evolutiva ni juicio profesional.'
        ),
        answersAvailabilityNote:
            'El detalle completo de preguntas y respuestas no está disponible en el payload actual del historial.'
    };
}

export function buildClinicalReportHtml(
    viewModel: ReportViewModel,
    options: {
        logoUrl: string;
        fileTitle: string;
    }
) {
    const domainCardsHtml = viewModel.domains.length > 0
        ? viewModel.domains.map((domain) => `
            <article class="report-domain-card">
                <h3>${escapeHtml(domain.domainLabel)}</h3>
                <p><strong>Probabilidad:</strong> ${escapeHtml(domain.probabilityText)}</p>
                <p><strong>Riesgo:</strong> ${escapeHtml(domain.riskText)}</p>
                <p><strong>Compatibilidad:</strong> ${escapeHtml(domain.compatibilityText)}</p>
                ${domain.confidenceText ? `<p><strong>Confianza:</strong> ${escapeHtml(domain.confidenceText)}</p>` : ''}
            </article>
        `).join('')
        : '<p>No se recibieron áreas estructuradas para este resultado.</p>';

    const compatibilityHtml = viewModel.compatibilityItems.length > 0
        ? `<ul>${viewModel.compatibilityItems.map((item) => `<li>${escapeHtml(item.text)}</li>`).join('')}</ul>`
        : '<p>No se recibió información estructurada de compatibilidad.</p>';

    const indicatorsHtml = viewModel.indicators.length > 0
        ? `<ul>${viewModel.indicators.map((item) => `<li>${escapeHtml(item.text)}</li>`).join('')}</ul>`
        : '<p>No hay indicadores clínicos adicionales disponibles para mostrar.</p>';

    const summaryHtml = `
        ${viewModel.summaryBlocks.bullets.length > 0 ? `
            <p class="report-section-label">Mayor compatibilidad observada:</p>
            <ul>
                ${viewModel.summaryBlocks.bullets.map((item) => `<li>${escapeHtml(item.domain)}: ${escapeHtml(item.level)}.</li>`).join('')}
            </ul>
        ` : ''}
        ${viewModel.summaryBlocks.levelText ? `<p><strong>Nivel global estimado:</strong> ${escapeHtml(viewModel.summaryBlocks.levelText)}.</p>` : ''}
        ${viewModel.summaryBlocks.paragraphs.length > 0
            ? viewModel.summaryBlocks.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')
            : '<p>No se recibió una síntesis narrativa adicional.</p>'}
    `;

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(options.fileTitle.replace(/\.pdf$/i, ''))}</title>
    <style>
        @page { margin: 16mm; }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            font-family: "Segoe UI", Arial, sans-serif;
            color: #16324f;
            background: #f8fbff;
        }
        .report-page {
            width: 100%;
            max-width: 980px;
            margin: 0 auto;
            padding: 24px;
        }
        .report-cover {
            position: relative;
            overflow: hidden;
            min-height: 100vh;
            background: #f8fbff;
            padding: 56px 40px;
            page-break-after: always;
        }
        .report-cover-orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(2px);
            opacity: 0.35;
        }
        .report-cover-orb--primary {
            width: 360px;
            height: 360px;
            top: -60px;
            right: -90px;
            background: #b7e3ff;
        }
        .report-cover-orb--secondary {
            width: 300px;
            height: 300px;
            left: -90px;
            bottom: -80px;
            background: #c9f1ea;
        }
        .report-cover-content {
            position: relative;
            z-index: 1;
            max-width: 720px;
            display: grid;
            gap: 20px;
        }
        .report-brand {
            display: inline-flex;
            align-items: center;
            gap: 14px;
            font-weight: 700;
            color: #215f8f;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }
        .report-brand img {
            width: 56px;
            height: 56px;
            object-fit: contain;
        }
        .report-cover h1 {
            margin: 0;
            font-size: 40px;
            line-height: 1.08;
            color: #12385a;
        }
        .report-cover h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 500;
            color: #35536d;
        }
        .report-cover-card {
            background: rgba(255,255,255,0.88);
            border: 1px solid rgba(33,95,143,0.12);
            border-radius: 24px;
            padding: 22px 24px;
            box-shadow: 0 24px 42px rgba(21, 58, 90, 0.08);
        }
        .report-meta-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin-top: 16px;
        }
        .report-meta-card {
            background: #ffffff;
            border: 1px solid rgba(33,95,143,0.12);
            border-radius: 16px;
            padding: 14px 16px;
        }
        .report-meta-card strong {
            display: block;
            font-size: 11px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #55738f;
            margin-bottom: 6px;
        }
        .report-alert {
            background: #e8f5ff;
            border: 1px solid rgba(23, 144, 233, 0.24);
            border-radius: 18px;
            padding: 16px 18px;
            color: #1a3a59;
            line-height: 1.6;
        }
        .report-section {
            background: #ffffff;
            border: 1px solid rgba(33,95,143,0.12);
            border-radius: 22px;
            padding: 24px;
            margin-bottom: 18px;
            box-shadow: 0 12px 24px rgba(21, 58, 90, 0.04);
        }
        .report-section h2 {
            margin: 0 0 12px;
            font-size: 20px;
            color: #12385a;
        }
        .report-section p,
        .report-section li {
            font-size: 14px;
            line-height: 1.7;
            color: #314f69;
        }
        .report-section-label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #55738f;
            margin-bottom: 10px;
        }
        .report-domain-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
        }
        .report-domain-card {
            border: 1px solid rgba(33,95,143,0.12);
            border-radius: 16px;
            padding: 16px;
            background: #fbfdff;
        }
        .report-domain-card h3 {
            margin: 0 0 10px;
            font-size: 17px;
            color: #12385a;
        }
        .report-domain-card p {
            margin: 0 0 6px;
        }
        ul {
            margin: 0;
            padding-left: 20px;
        }
        .report-footer-note {
            font-size: 13px;
            color: #48637d;
        }
        @media print {
            .report-page { padding: 0; }
        }
    </style>
</head>
<body>
    <section class="report-cover">
        <div class="report-cover-orb report-cover-orb--primary"></div>
        <div class="report-cover-orb report-cover-orb--secondary"></div>
        <div class="report-cover-content">
            <div class="report-brand">
                <img src="${escapeHtml(options.logoUrl)}" alt="CognIA" />
                <span>CognIA</span>
            </div>
            <div>
                <p class="report-section-label">Reporte orientativo para revisión profesional</p>
                <h1>${escapeHtml(viewModel.title)}</h1>
                <h2>Resultado de tamizaje y apoyo a revisión profesional.</h2>
            </div>
            <div class="report-cover-card">
                <p>Este documento resume resultados orientativos del cuestionario. No reemplaza entrevista clínica, historia evolutiva ni juicio profesional. No constituye diagnóstico.</p>
                <div class="report-meta-grid">
                    <div class="report-meta-card"><strong>ID cuestionario</strong><span>${escapeHtml(viewModel.questionnaireId)}</span></div>
                    <div class="report-meta-card"><strong>ID de sesión</strong><span>${escapeHtml(viewModel.sessionId)}</span></div>
                    <div class="report-meta-card"><strong>Fecha</strong><span>${escapeHtml(viewModel.generatedAt)}</span></div>
                    <div class="report-meta-card"><strong>Modo</strong><span>${escapeHtml(viewModel.modeLabel)}</span></div>
                    <div class="report-meta-card"><strong>Respondiente</strong><span>${escapeHtml(viewModel.roleLabel)}</span></div>
                    <div class="report-meta-card"><strong>Versión</strong><span>${escapeHtml(viewModel.version)}</span></div>
                </div>
            </div>
        </div>
    </section>
    <main class="report-page">
        <section class="report-section">
            <h2>Aviso importante</h2>
            <div class="report-alert">
                Este resultado es orientativo y sirve como apoyo de alerta temprana; no constituye diagnóstico clínico definitivo. Debe interpretarse junto con entrevista clínica, historia evolutiva, contexto familiar/escolar y criterio profesional.
            </div>
        </section>
        <section class="report-section">
            <h2>Resumen del caso</h2>
            ${summaryHtml}
        </section>
        <section class="report-section">
            <h2>Resultado por áreas</h2>
            <div class="report-domain-grid">${domainCardsHtml}</div>
        </section>
        <section class="report-section">
            <h2>Niveles de compatibilidad</h2>
            ${compatibilityHtml}
        </section>
        <section class="report-section">
            <h2>Patrones e indicadores observados</h2>
            ${indicatorsHtml}
        </section>
        <section class="report-section">
            <h2>Impacto funcional</h2>
            <p>${escapeHtml(viewModel.functionalImpact)}</p>
        </section>
        <section class="report-section">
            <h2>Recomendación profesional</h2>
            <p>${escapeHtml(viewModel.professionalRecommendation)}</p>
        </section>
        <section class="report-section">
            <h2>Comorbilidad o coexistencia</h2>
            <p>${escapeHtml(viewModel.comorbidityText)}</p>
        </section>
        <section class="report-section">
            <h2>Aclaración importante</h2>
            <p>${escapeHtml(viewModel.clarification)}</p>
        </section>
        <section class="report-section">
            <h2>Limitaciones</h2>
            <p>${escapeHtml(viewModel.disclaimer)}</p>
            <p class="report-footer-note">Este reporte no reemplaza evaluación clínica, entrevista, historia evolutiva ni juicio profesional.</p>
        </section>
        <section class="report-section">
            <h2>Cuestionario completo respondido</h2>
            <p>${escapeHtml(viewModel.answersAvailabilityNote)}</p>
        </section>
    </main>
</body>
</html>`;
}
