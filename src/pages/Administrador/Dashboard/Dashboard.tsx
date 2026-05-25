import { useEffect, useMemo, useState } from 'react';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { useDashboard } from '../../../hooks/dashboard/useDashboard';
import type {
    DashboardAdoptionHistoryResponse,
    DashboardBlockState,
    DashboardFunnelResponse,
    DashboardMetricNode,
    DashboardSeriesPoint,
    DashboardSeriesResponse
} from '../../../services/dashboard/dashboard.types';
import { humanizeTechnicalKey } from '../../../utils/presentation/naturalLanguage';
import './Dashboard.css';

const MONTH_OPTIONS = [1, 3, 6, 12, 24, 36, 60, 120].map((value) => ({
    value: String(value),
    label: `${value} mes${value === 1 ? '' : 'es'}`
}));

const LABEL_MAP: Record<string, string> = {
    active_users: 'Usuarios activos',
    new_users: 'Nuevos usuarios',
    total_users: 'Total de usuarios',
    sessions_created: 'Cuestionarios creados',
    sessions_submitted: 'Cuestionarios enviados',
    sessions_processed: 'Resultados procesados',
    draft_sessions: 'Borradores',
    in_progress_sessions: 'En progreso',
    failed_sessions: 'Fallidos',
    archived_sessions: 'Archivados',
    completion_rate: 'Tasa de finalización',
    processing_rate: 'Tasa de procesamiento',
    error_rate: 'Tasa de error',
    success_rate: 'Tasa de éxito',
    avg_latency_ms: 'Latencia promedio',
    p95_latency_ms: 'Latencia P95',
    missingness_score: 'Datos faltantes',
    completion_quality_score: 'Calidad de completitud',
    drift_score: 'Nivel de cambio',
    equity_gap: 'Brecha entre grupos',
    confidence_band: 'Banda de confianza',
    confidence_pct: 'Confianza',
    operational_class: 'Clasificación operativa',
    operational_caveat: 'Nota operativa',
    last_updated: 'Última actualización',
    generated_at: 'Generado el',
    created_at: 'Creado el',
    updated_at: 'Actualizado el',
    conversion_created_to_processed: 'Conversión final',
    processed_per_user: 'Procesadas por usuario',
    registered_users: 'Usuarios registrados',
    volume_and_growth: 'Volumen y crecimiento',
    user_growth: 'Crecimiento de usuarios',
    operational_capacity: 'Capacidad operativa',
    api_health: 'Estado de servicios',
    data_quality: 'Calidad de datos',
    model_monitoring: 'Seguimiento de modelos',
    drift: 'Cambios en los datos',
    equity: 'Equidad entre grupos',
    retention: 'Continuidad de uso',
    productivity: 'Productividad',
    human_review: 'Revisión profesional'
};

const DOMAIN_LABELS: Record<string, string> = {
    adhd: 'TDAH',
    conduct: 'Conducta',
    elimination: 'Eliminación',
    anxiety: 'Ansiedad',
    depression: 'Depresión'
};

const TECHNICAL_DASHBOARD_KEYS = new Set([
    'id',
    'uuid',
    'jti',
    'session_id',
    'questionnaire_id',
    'model_id',
    'activation_id',
    'pipeline_version',
    'artifact_path',
    'fallback_artifact_path',
    'metadata',
    'metadata_json',
    'payload',
    'raw',
    'raw_value',
    'feature',
    'feature_key',
    'feature_columns',
    'internal',
    'debug',
    'trace',
    'stack',
    'sql',
    'query'
]);

const DATE_KEY_HINTS = ['last_updated', 'generated_at', 'created_at', 'updated_at', 'date', 'fecha'];
const PERCENT_KEY_HINTS = ['rate', 'ratio', 'pct', 'percent', 'percentage', 'probability', 'score', 'confidence'];
const MS_KEY_HINTS = ['latency_ms', '_ms', 'ms'];
const COUNT_KEY_HINTS = ['count', 'total', 'sessions', 'users', 'alerts', 'domains', 'created', 'submitted', 'processed'];

type PrimitiveValue = string | number | boolean | null;
type Tone = 'neutral' | 'good' | 'warning' | 'danger';

type DashboardCard = {
    label: string;
    value: string;
    helper?: string;
    tone?: Tone;
};

type FlattenedMetric = {
    key: string;
    value: PrimitiveValue;
};

type BlockErrorProps = Readonly<{ message: string; status: number | null }>;
type SectionSeriesKey = 'userGrowth' | 'questionnaireVolume' | 'questionnaireQuality' | 'apiHealth' | 'dataQuality';
type SectionSeriesProps = Readonly<{
    sectionKey: SectionSeriesKey;
    title: string;
    description?: string;
    state: DashboardBlockState<DashboardSeriesResponse>;
}>;
type SectionFunnelProps = Readonly<{
    title: string;
    description?: string;
    state: DashboardBlockState<DashboardFunnelResponse>;
}>;
type SectionMetricProps = Readonly<{
    title: string;
    description?: string;
    state: DashboardBlockState<DashboardAdoptionHistoryResponse>;
    mode: 'executive' | 'generic' | 'model' | 'drift' | 'equity' | 'retention';
    prioritized?: boolean;
}>;
type DashboardFallbackOptions<TData> = Readonly<{
    isEmptyData?: (data: TData) => boolean;
}>;

type PeriodMeta = {
    label: string;
    valid: boolean;
    hiddenForSeries: boolean;
    invalidDateLike: boolean;
};

function clampMonths(value: number) {
    if (!Number.isFinite(value)) return 12;
    const parsed = Math.trunc(value);
    if (parsed < 1) return 1;
    if (parsed > 120) return 120;
    return parsed;
}

function normalizeKey(value: string) {
    return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function humanizeValueLabel(value: string) {
    const normalized = normalizeKey(value);
    if (DOMAIN_LABELS[normalized]) return DOMAIN_LABELS[normalized];
    return humanizeTechnicalKey(normalized);
}

function formatLabel(key: string) {
    const normalized = normalizeKey(key);
    return LABEL_MAP[normalized] ?? humanizeValueLabel(key);
}

function isReasonableDashboardDate(date: Date) {
    const year = date.getFullYear();
    const currentYear = new Date().getFullYear();
    return year >= 2020 && year <= currentYear + 1;
}

function parseReasonableDate(raw: string) {
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime()) || !isReasonableDashboardDate(parsed)) {
        return null;
    }
    return parsed;
}

function formatDashboardPeriodLabel(period: unknown): PeriodMeta {
    if (typeof period !== 'string') {
        return { label: 'Periodo no disponible', valid: false, hiddenForSeries: true, invalidDateLike: false };
    }

    const normalized = period.trim();
    if (!normalized) {
        return { label: 'Periodo no disponible', valid: false, hiddenForSeries: true, invalidDateLike: false };
    }

    const monthlyMatch = /^(\d{4})-(\d{2})$/.exec(normalized);
    if (monthlyMatch) {
        const year = Number(monthlyMatch[1]);
        const month = Number(monthlyMatch[2]);
        if (Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12) {
            const date = new Date(year, month - 1, 1);
            if (isReasonableDashboardDate(date)) {
                return {
                    label: new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(date),
                    valid: true,
                    hiddenForSeries: false,
                    invalidDateLike: false
                };
            }
        }
        return { label: 'Sin fecha válida', valid: false, hiddenForSeries: true, invalidDateLike: true };
    }

    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
    if (dateMatch) {
        const date = parseReasonableDate(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T00:00:00`);
        if (date) {
            return {
                label: new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(date),
                valid: true,
                hiddenForSeries: false,
                invalidDateLike: false
            };
        }
        return { label: 'Sin fecha válida', valid: false, hiddenForSeries: true, invalidDateLike: true };
    }

    if (/^\d{4}-\d{2}-\d{2}T/.test(normalized)) {
        const date = parseReasonableDate(normalized);
        if (date) {
            return {
                label: new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(date),
                valid: true,
                hiddenForSeries: false,
                invalidDateLike: false
            };
        }
        return { label: 'Sin fecha válida', valid: false, hiddenForSeries: true, invalidDateLike: true };
    }

    if (/^\d+$/.test(normalized)) {
        return {
            label: `Periodo ${normalized}`,
            valid: true,
            hiddenForSeries: false,
            invalidDateLike: false
        };
    }

    return {
        label: humanizeValueLabel(normalized),
        valid: true,
        hiddenForSeries: false,
        invalidDateLike: false
    };
}

function hasHint(key: string, hints: string[]) {
    return hints.some((hint) => key.includes(hint));
}

function formatPercent(value: number) {
    return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(value)} %`;
}

function formatDashboardValue(key: string, value: unknown): string {
    const normalizedKey = normalizeKey(key);

    if (value === null || value === undefined) return 'No disponible';
    if (typeof value === 'number' && Number.isNaN(value)) return 'No disponible';

    if (typeof value === 'boolean') {
        return value ? 'Sí' : 'No';
    }

    if (typeof value === 'number') {
        if (hasHint(normalizedKey, PERCENT_KEY_HINTS)) {
            if (value >= 0 && value <= 1) return formatPercent(value * 100);
            if (value >= 0 && value <= 100) return formatPercent(value);
        }
        if (hasHint(normalizedKey, MS_KEY_HINTS)) {
            return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: value % 1 === 0 ? 0 : 1 }).format(value)} ms`;
        }
        if (hasHint(normalizedKey, COUNT_KEY_HINTS)) {
            return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Math.trunc(value));
        }
        return new Intl.NumberFormat('es-CO', { maximumFractionDigits: value % 1 === 0 ? 0 : 2 }).format(value);
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return 'No disponible';

        if (hasHint(normalizedKey, DATE_KEY_HINTS)) {
            return formatDashboardPeriodLabel(trimmed).label;
        }

        const numeric = Number(trimmed);
        if (trimmed.length > 0 && Number.isFinite(numeric) && /^-?\d+(\.\d+)?$/.test(trimmed)) {
            return formatDashboardValue(normalizedKey, numeric);
        }

        const lowered = normalizeKey(trimmed);
        if (DOMAIN_LABELS[lowered]) return DOMAIN_LABELS[lowered];
        if (lowered === 'ok') return 'OK';
        if (['active', 'operational', 'available', 'healthy', 'enabled', 'ready', 'connected', 'configured', 'success', 'online'].includes(lowered)) {
            return 'Disponible';
        }
        if (['warning', 'degraded', 'limited'].includes(lowered)) {
            return 'Requiere atención';
        }
        if (['error', 'failed', 'offline', 'unavailable'].includes(lowered)) {
            return 'No disponible';
        }

        if (/^\d{4}-\d{2}(-\d{2}(t.*)?)?$/i.test(trimmed)) {
            return formatDashboardPeriodLabel(trimmed).label;
        }

        return humanizeValueLabel(trimmed);
    }

    if (Array.isArray(value) || typeof value === 'object') {
        return 'Información disponible';
    }

    return 'No disponible';
}

function isPrimitive(value: unknown): value is PrimitiveValue {
    return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function shouldHideTechnicalKey(key: string) {
    const normalized = normalizeKey(key);
    if (TECHNICAL_DASHBOARD_KEYS.has(normalized)) return true;
    return [...TECHNICAL_DASHBOARD_KEYS].some((technicalKey) => normalized.endsWith(`_${technicalKey}`));
}

function flattenMetricNode(node: DashboardMetricNode, path: string[] = []): FlattenedMetric[] {
    if (node === null) return [];
    if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
        const key = normalizeKey(path.join('_'));
        if (!key || shouldHideTechnicalKey(key)) return [];
        return [{ key, value: node }];
    }

    if (Array.isArray(node)) {
        return node.flatMap((item, index) => flattenMetricNode(item, [...path, String(index + 1)]));
    }

    return Object.entries(node).flatMap(([key, value]) => {
        const nextPath = [...path, key];
        const normalized = normalizeKey(nextPath.join('_'));
        if (shouldHideTechnicalKey(normalized)) return [];
        if (isPrimitive(value)) {
            return [{ key: normalized, value }];
        }
        return flattenMetricNode(value, nextPath);
    });
}

function dedupeFlattenedMetrics(metrics: FlattenedMetric[]) {
    const seen = new Set<string>();
    return metrics.filter((metric) => {
        if (!metric.key || seen.has(metric.key)) return false;
        seen.add(metric.key);
        return true;
    });
}

function findMetric(metrics: FlattenedMetric[], aliases: string[]) {
    const normalizedAliases = aliases.map(normalizeKey);
    for (const alias of normalizedAliases) {
        const exact = metrics.find((metric) => metric.key === alias);
        if (exact) return exact;
        const suffix = metrics.find((metric) => metric.key.endsWith(`_${alias}`));
        if (suffix) return suffix;
    }
    return null;
}

function getNumberMetric(metrics: FlattenedMetric[], aliases: string[]) {
    const match = findMetric(metrics, aliases);
    if (!match) return null;
    return typeof match.value === 'number' && Number.isFinite(match.value) ? match.value : null;
}

function getStringMetric(metrics: FlattenedMetric[], aliases: string[]) {
    const match = findMetric(metrics, aliases);
    if (!match || typeof match.value !== 'string') return null;
    const trimmed = match.value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function buildFallbackCards(metrics: FlattenedMetric[], limit = 6): DashboardCard[] {
    return metrics
        .filter((metric) => !shouldHideTechnicalKey(metric.key))
        .slice(0, limit)
        .map((metric) => ({
            label: formatLabel(metric.key),
            value: formatDashboardValue(metric.key, metric.value),
            tone: 'neutral'
        }));
}

function getAvailabilityTone(value: string | null): Tone {
    const normalized = normalizeKey(value ?? '');
    if (['ok', 'active', 'operational', 'available', 'healthy', 'enabled', 'ready', 'connected', 'configured', 'success', 'online'].includes(normalized)) {
        return 'good';
    }
    if (['warning', 'degraded', 'limited'].includes(normalized)) return 'warning';
    if (['error', 'failed', 'offline', 'unavailable'].includes(normalized)) return 'danger';
    return 'neutral';
}

function buildAdoptionSummaryCards(adoption: DashboardMetricNode): DashboardCard[] {
    const metrics = dedupeFlattenedMetrics(flattenMetricNode(adoption));
    const cards: DashboardCard[] = [];

    const sessionsCreated = getNumberMetric(metrics, ['sessions_created', 'created_sessions', 'created']);
    const sessionsSubmitted = getNumberMetric(metrics, ['sessions_submitted', 'submitted_sessions', 'submitted']);
    const sessionsProcessed = getNumberMetric(metrics, ['sessions_processed', 'processed_sessions', 'processed']);
    const totalUsers = getNumberMetric(metrics, ['total_users', 'registered_users', 'active_users', 'new_users']);
    const conversion = getNumberMetric(metrics, ['conversion_created_to_processed', 'processing_rate', 'completion_rate', 'success_rate']);
    const processedPerUser = getNumberMetric(metrics, ['processed_per_user']);
    const operationalClass = getStringMetric(metrics, ['operational_class', 'operational_capacity', 'capacity']);
    const operationalCaveat = getStringMetric(metrics, ['operational_caveat']);

    if (sessionsCreated !== null) cards.push({ label: 'Sesiones creadas', value: formatDashboardValue('sessions_created', sessionsCreated), tone: 'neutral' });
    if (sessionsSubmitted !== null) cards.push({ label: 'Sesiones enviadas', value: formatDashboardValue('sessions_submitted', sessionsSubmitted), tone: 'neutral' });
    if (sessionsProcessed !== null) cards.push({ label: 'Sesiones procesadas', value: formatDashboardValue('sessions_processed', sessionsProcessed), tone: 'good' });
    if (totalUsers !== null) cards.push({ label: 'Usuarios registrados', value: formatDashboardValue('total_users', totalUsers), tone: 'neutral' });
    if (conversion !== null) {
        cards.push({
            label: 'Conversión a procesadas',
            value: formatDashboardValue('processing_rate', conversion),
            helper: 'De cuestionarios creados a resultados procesados',
            tone: conversion >= 0.7 ? 'good' : conversion >= 0.4 ? 'warning' : 'danger'
        });
    }
    if (processedPerUser !== null) cards.push({ label: 'Promedio procesadas por usuario', value: formatDashboardValue('processed_per_user', processedPerUser), tone: 'neutral' });
    if (operationalClass) {
        cards.push({
            label: 'Capacidad operativa',
            value: formatDashboardValue('operational_class', operationalClass),
            helper: operationalCaveat ? formatDashboardValue('operational_caveat', operationalCaveat) : undefined,
            tone: getAvailabilityTone(operationalClass)
        });
    }

    return cards.length > 0 ? cards : buildFallbackCards(metrics);
}

function buildModelMonitoringCards(adoption: DashboardMetricNode): DashboardCard[] {
    const metrics = dedupeFlattenedMetrics(flattenMetricNode(adoption));
    const activeModels = getNumberMetric(metrics, ['active_models', 'models_active', 'model_count']);
    const avgConfidence = getNumberMetric(metrics, ['confidence_pct', 'avg_confidence', 'average_confidence']);
    const monitoredDomains = getNumberMetric(metrics, ['monitored_domains', 'domains_monitored', 'domain_count']);
    const alerts = getNumberMetric(metrics, ['alerts', 'alert_count', 'warning_count']);
    const lastUpdated = getStringMetric(metrics, ['last_updated', 'updated_at', 'generated_at']);

    const cards: DashboardCard[] = [];
    if (activeModels !== null) cards.push({ label: 'Modelos activos', value: formatDashboardValue('total_models', activeModels), tone: activeModels > 0 ? 'good' : 'warning' });
    if (avgConfidence !== null) cards.push({ label: 'Confianza promedio', value: formatDashboardValue('confidence_pct', avgConfidence), tone: avgConfidence >= 0.7 ? 'good' : avgConfidence >= 0.4 ? 'warning' : 'danger' });
    if (monitoredDomains !== null) cards.push({ label: 'Dominios monitoreados', value: formatDashboardValue('domains', monitoredDomains), tone: 'neutral' });
    if (alerts !== null) cards.push({ label: 'Alertas operativas', value: formatDashboardValue('alerts', alerts), tone: alerts === 0 ? 'good' : alerts <= 3 ? 'warning' : 'danger' });
    if (lastUpdated) cards.push({ label: 'Última actualización válida', value: formatDashboardValue('last_updated', lastUpdated), tone: 'neutral' });

    return cards.length > 0 ? cards : buildFallbackCards(metrics);
}

function buildInsightCards(adoption: DashboardMetricNode, mode: 'drift' | 'equity' | 'retention'): DashboardCard[] {
    const metrics = dedupeFlattenedMetrics(flattenMetricNode(adoption));
    const metricKey = mode === 'drift' ? 'drift_score' : mode === 'equity' ? 'equity_gap' : 'retention_rate';
    const metricValue = getNumberMetric(metrics, [metricKey, 'score', 'rate', 'ratio']);
    const status = getStringMetric(metrics, ['status', 'operational_class', 'confidence_band']);
    const note = getStringMetric(metrics, ['operational_caveat', 'note', 'summary', 'description']);

    const cards: DashboardCard[] = [];
    if (metricValue !== null) {
        const tone = metricValue >= 0.7 ? 'danger' : metricValue >= 0.4 ? 'warning' : 'good';
        cards.push({
            label: mode === 'drift' ? 'Nivel de cambio' : mode === 'equity' ? 'Brecha entre grupos' : 'Continuidad observada',
            value: formatDashboardValue(metricKey, metricValue),
            helper:
                mode === 'drift'
                    ? metricValue >= 0.7
                        ? 'Requiere revisión.'
                        : metricValue >= 0.4
                            ? 'Cambios leves.'
                            : 'Sin cambios relevantes detectados.'
                    : mode === 'equity'
                        ? metricValue >= 0.7
                            ? 'Hay diferencias importantes que requieren revisión.'
                            : metricValue >= 0.4
                                ? 'Se observan brechas leves.'
                                : 'Sin brechas relevantes.'
                        : metricValue >= 0.7
                            ? 'La continuidad de uso es alta.'
                            : metricValue >= 0.4
                                ? 'Hay continuidad moderada.'
                                : 'La continuidad de uso es baja.',
            tone
        });
    }
    if (status) {
        cards.push({
            label: 'Estado general',
            value: formatDashboardValue('status', status),
            helper: note ? formatDashboardValue('operational_caveat', note) : undefined,
            tone: getAvailabilityTone(status)
        });
    }

    return cards.length > 0 ? cards : buildFallbackCards(metrics, 4);
}

function buildGenericAdoptionCards(adoption: DashboardMetricNode): DashboardCard[] {
    const metrics = dedupeFlattenedMetrics(flattenMetricNode(adoption));
    return buildFallbackCards(metrics, 6);
}

function resolveBlockErrorMessage(message: string, status: number | null) {
    if (status === 400) return 'La solicitud para este bloque no es válida con el rango seleccionado.';
    if (status === 401) return 'La sesión no es válida para consultar este bloque.';
    if (status === 403) return 'No tienes permisos para consultar este bloque.';
    if (status === 404) return 'Este bloque no está disponible en el entorno actual.';
    if (status === 429) return 'Hay demasiadas consultas en este momento. Intenta nuevamente en unos segundos.';
    if (status !== null && status >= 500) return 'El servicio presentó un problema interno al generar este bloque.';
    return message || 'No fue posible cargar este bloque.';
}

function BlockError({ message, status }: BlockErrorProps) {
    return (
        <div className="dashboard-block-error" role="status" aria-live="polite">
            <strong>No se pudo cargar este bloque</strong>
            <span>{resolveBlockErrorMessage(message, status)}</span>
            {status ? <small>Código técnico: HTTP {status}</small> : null}
        </div>
    );
}

function BlockLoading() {
    return (
        <div className="dashboard-block-loading" aria-live="polite">
            <span className="dashboard-shimmer-line" />
            <span className="dashboard-shimmer-line short" />
            <span className="dashboard-shimmer-line" />
        </div>
    );
}

function renderDashboardFallback<TData>(state: DashboardBlockState<TData>, options?: DashboardFallbackOptions<TData>) {
    if (state.status === 'loading' || state.status === 'idle') return <BlockLoading />;
    if (state.status === 'error' && state.error) {
        return <BlockError message={state.error.message} status={state.error.status} />;
    }
    if (!state.data || state.status === 'empty') {
        return <p className="dashboard-empty">No hay datos para el rango seleccionado.</p>;
    }
    if (options?.isEmptyData?.(state.data)) {
        return <p className="dashboard-empty">No hay datos para el rango seleccionado.</p>;
    }
    return null;
}

function buildSparklinePath(points: Array<{ value: number }>, width: number, height: number) {
    if (points.length < 2) return '';
    const max = Math.max(...points.map((point) => point.value), 1);
    const min = Math.min(...points.map((point) => point.value), 0);
    const range = max - min || 1;
    const step = width / (points.length - 1);

    return points
        .map((point, index) => {
            const x = index * step;
            const normalized = (point.value - min) / range;
            const y = height - normalized * height;
            return `${index === 0 ? 'M' : 'L'}${x},${y}`;
        })
        .join(' ');
}

function renderCards(cards: DashboardCard[]) {
    return (
        <div className="dashboard-card-grid">
            {cards.map((card) => (
                <article key={`${card.label}-${card.value}`} className={`dashboard-card dashboard-card--${card.tone ?? 'neutral'}`}>
                    <span className="dashboard-card-label">{card.label}</span>
                    <strong className="dashboard-card-value">{card.value}</strong>
                    {card.helper ? <span className="dashboard-card-helper">{card.helper}</span> : null}
                </article>
            ))}
        </div>
    );
}

function buildTechnicalRows(node: DashboardMetricNode) {
    return dedupeFlattenedMetrics(flattenMetricNode(node)).map((metric) => ({
        label: formatLabel(metric.key),
        value: formatDashboardValue(metric.key, metric.value)
    }));
}

function SectionMetric({ title, description, state, mode, prioritized = false }: SectionMetricProps) {
    const fallback = renderDashboardFallback(state);
    if (fallback) return fallback;

    const adoption = state.data!.adoption_history;
    const adoptionNode = adoption as unknown as DashboardMetricNode;
    const cards =
        mode === 'executive'
            ? buildAdoptionSummaryCards(adoptionNode)
            : mode === 'model'
                ? buildModelMonitoringCards(adoptionNode)
                : mode === 'drift' || mode === 'equity' || mode === 'retention'
                    ? buildInsightCards(adoptionNode, mode)
                    : buildGenericAdoptionCards(adoptionNode);
    const technicalRows = buildTechnicalRows(adoptionNode);

    return (
        <section className={`dashboard-section ${prioritized ? 'is-prioritized' : ''}`}>
            <div className="dashboard-section-title-row">
                <div>
                    <h2>{title}</h2>
                    {description ? <p className="dashboard-section-description">{description}</p> : null}
                </div>
            </div>
            {renderCards(cards)}
            {technicalRows.length > 0 ? (
                <details className="dashboard-technical-details">
                    <summary>Ver detalle técnico</summary>
                    <div className="dashboard-table compact">
                        <div className="dashboard-table-row head">
                            <span>Indicador</span>
                            <span>Valor</span>
                        </div>
                        {technicalRows.map((row) => (
                            <div className="dashboard-table-row" key={`${row.label}-${row.value}`}>
                                <span>{row.label}</span>
                                <span>{row.value}</span>
                            </div>
                        ))}
                    </div>
                </details>
            ) : null}
        </section>
    );
}

function formatSeriesValue(point: DashboardSeriesPoint, sectionKey: SectionSeriesKey) {
    return formatDashboardValue(sectionKey, point.value ?? point.raw_value);
}

function summarizeSeries(sectionKey: SectionSeriesKey, series: DashboardSeriesPoint[]) {
    const normalizedRows = series.map((point) => ({ point, meta: formatDashboardPeriodLabel(point.period) }));
    const invalidDateLikeCount = normalizedRows.filter((row) => row.meta.invalidDateLike).length;
    const rows = normalizedRows.filter((row) => !row.meta.hiddenForSeries);
    const numericValues = rows
        .map((row) => row.point.value)
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

    const latestPoint = rows.at(-1)?.point ?? null;
    const average = numericValues.length > 0 ? numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length : null;
    const trend = numericValues.length >= 2 ? numericValues[numericValues.length - 1] - numericValues[0] : null;
    const sparkline = buildSparklinePath(numericValues.map((value) => ({ value })), 220, 46);

    const cards: DashboardCard[] = [];
    if (latestPoint) {
        cards.push({
            label: sectionKey === 'apiHealth' ? 'Último registro' : sectionKey === 'dataQuality' ? 'Último indicador' : 'Valor reciente',
            value: formatSeriesValue(latestPoint, sectionKey),
            helper: formatDashboardPeriodLabel(latestPoint.period).label,
            tone: 'neutral'
        });
    }
    if (average !== null) {
        cards.push({ label: 'Promedio del periodo', value: formatDashboardValue(sectionKey, average), tone: 'neutral' });
    }
    if (trend !== null) {
        cards.push({
            label: 'Tendencia',
            value: trend === 0 ? 'Sin cambios relevantes' : `${trend > 0 ? '+' : '-'}${formatDashboardValue(sectionKey, Math.abs(trend))}`,
            helper: trend > 0 ? 'Va en aumento' : trend < 0 ? 'Va en descenso' : 'Se mantiene estable',
            tone: trend > 0 ? 'good' : trend < 0 ? 'warning' : 'neutral'
        });
    }
    cards.push({
        label: 'Periodos válidos',
        value: formatDashboardValue('count', rows.length),
        helper: invalidDateLikeCount > 0 ? 'Se ocultaron periodos fuera de rango.' : undefined,
        tone: invalidDateLikeCount > 0 ? 'warning' : 'neutral'
    });

    return { cards, rows, invalidDateLikeCount, sparkline };
}

function SectionSeries({ sectionKey, title, description, state }: SectionSeriesProps) {
    const fallback = renderDashboardFallback(state, { isEmptyData: (data) => data.series.length === 0 });
    if (fallback) return fallback;

    const summary = summarizeSeries(sectionKey, state.data!.series);
    if (summary.rows.length === 0) {
        return (
            <section className="dashboard-section">
                <div className="dashboard-section-title-row">
                    <div>
                        <h2>{title}</h2>
                        {description ? <p className="dashboard-section-description">{description}</p> : null}
                    </div>
                </div>
                <p className="dashboard-empty">No hay datos válidos para el rango seleccionado.</p>
            </section>
        );
    }

    return (
        <section className="dashboard-section dashboard-series-section">
            <div className="dashboard-section-title-row">
                <div>
                    <h2>{title}</h2>
                    {description ? <p className="dashboard-section-description">{description}</p> : null}
                </div>
                {summary.sparkline ? (
                    <svg className="dashboard-sparkline" viewBox="0 0 220 46" aria-label={`Tendencia de ${title}`}>
                        <path d={summary.sparkline} />
                    </svg>
                ) : null}
            </div>

            {renderCards(summary.cards)}

            {summary.invalidDateLikeCount > 0 ? (
                <div className="dashboard-inline-note" role="status">
                    El backend devolvió periodos fuera del rango esperado. Se ocultaron valores no válidos.
                </div>
            ) : null}

            <div className="dashboard-table compact">
                <div className="dashboard-table-row head">
                    <span>Periodo</span>
                    <span>Valor</span>
                </div>
                {summary.rows.map(({ point, meta }) => (
                    <div className="dashboard-table-row" key={`${point.period}-${point.value ?? point.raw_value ?? 'empty'}`}>
                        <span>{meta.label}</span>
                        <span>{formatSeriesValue(point, sectionKey)}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}

function SectionFunnel({ title, description, state }: SectionFunnelProps) {
    const fallback = renderDashboardFallback(state);
    if (fallback) return fallback;
    const funnelData = state.data!;

    const created = funnelData.created ?? 0;
    const submitted = funnelData.submitted ?? 0;
    const processed = funnelData.processed ?? 0;
    const max = Math.max(created, submitted, processed, 1);
    const conversion = funnelData.conversion_created_to_processed;

    return (
        <section className="dashboard-section dashboard-funnel-block">
            <div className="dashboard-section-title-row">
                <div>
                    <h2>{title}</h2>
                    {description ? <p className="dashboard-section-description">{description}</p> : null}
                </div>
            </div>
            <div className="dashboard-funnel-rows">
                <div className="dashboard-funnel-row">
                    <span>Cuestionarios creados</span>
                    <div className="dashboard-funnel-track"><i style={{ width: `${(created / max) * 100}%` }} /></div>
                    <strong>{formatDashboardValue('sessions_created', created)}</strong>
                </div>
                <div className="dashboard-funnel-row">
                    <span>Cuestionarios enviados</span>
                    <div className="dashboard-funnel-track"><i style={{ width: `${(submitted / max) * 100}%` }} /></div>
                    <strong>{formatDashboardValue('sessions_submitted', submitted)}</strong>
                </div>
                <div className="dashboard-funnel-row">
                    <span>Resultados procesados</span>
                    <div className="dashboard-funnel-track"><i style={{ width: `${(processed / max) * 100}%` }} /></div>
                    <strong>{formatDashboardValue('sessions_processed', processed)}</strong>
                </div>
            </div>
            <div className="dashboard-funnel-conversion">
                <span>Conversión final</span>
                <strong>{conversion === null ? 'No disponible' : formatDashboardValue('conversion_created_to_processed', conversion)}</strong>
            </div>
        </section>
    );
}

export default function Dashboard() {
    const { months, setMonths, blocks, isReloading, reload, lastUpdated } = useDashboard();
    const [monthsInput, setMonthsInput] = useState(String(months));

    useEffect(() => {
        setMonthsInput(String(months));
    }, [months]);

    const hasCriticalAuthError = useMemo(
        () =>
            Object.values(blocks).some(
                (block) => block.status === 'error' && (block.error?.status === 401 || block.error?.status === 403)
            ),
        [blocks]
    );

    const applyMonths = () => {
        const parsed = Number(monthsInput);
        setMonths(clampMonths(parsed));
    };

    return (
        <div className="dashboard-page">
            <header className="dashboard-header">
                <div>
                    <h1>Panel general</h1>
                    <p>Resumen visual del uso, calidad y operación de CognIA.</p>
                    <span className="dashboard-header-meta">
                        {lastUpdated ? `Actualizado: ${new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(lastUpdated)}` : 'Sin actualización reciente'}
                    </span>
                </div>
                <div className="dashboard-controls">
                    <label>
                        <span>Rango (meses)</span>
                        <input
                            type="number"
                            min={1}
                            max={120}
                            value={monthsInput}
                            onChange={(event) => setMonthsInput(event.target.value)}
                            onBlur={applyMonths}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    applyMonths();
                                }
                            }}
                        />
                    </label>
                    <label>
                        <span>Atajo</span>
                        <CustomSelect
                            value={String(months)}
                            options={MONTH_OPTIONS}
                            ariaLabel="Seleccionar meses del dashboard"
                            onChange={(value) => setMonths(Number(value))}
                            placeholder="Personalizado"
                        />
                    </label>
                    <button type="button" className="dashboard-refresh" onClick={reload} disabled={isReloading}>
                        {isReloading ? 'Actualizando...' : 'Actualizar'}
                    </button>
                </div>
            </header>

            <div className="dashboard-divider" aria-hidden="true" />

            {hasCriticalAuthError ? (
                <div className="dashboard-global-alert" role="status" aria-live="polite">
                    Algunos bloques requieren permisos adicionales para tu sesión actual.
                </div>
            ) : null}

            <SectionMetric
                title="Resumen ejecutivo"
                description="Lectura general del rendimiento operativo y del uso reciente de la plataforma."
                state={blocks.executiveSummary}
                mode="executive"
                prioritized
            />
            <SectionMetric
                title="Adopción de la plataforma"
                description="Lectura consolidada del volumen, crecimiento y capacidad operativa en el periodo seleccionado."
                state={blocks.adoptionHistory}
                mode="generic"
            />

            <section className="dashboard-funnel-grid">
                <SectionFunnel title="Embudo de cuestionarios" description="Paso a paso del flujo desde la creación hasta el resultado procesado." state={blocks.funnel} />
                <SectionFunnel title="Productividad" description="Ritmo general de procesamiento y avance del trabajo operativo." state={blocks.productivity} />
                <SectionFunnel title="Revisión profesional" description="Casos que pasan por revisión antes del cierre del flujo." state={blocks.humanReview} />
            </section>

            <SectionSeries
                sectionKey="userGrowth"
                title="Crecimiento de usuarios"
                description="Tendencia de nuevas altas y variación del total de usuarios."
                state={blocks.userGrowth}
            />

            <section className="dashboard-series-grid">
                <SectionSeries sectionKey="questionnaireVolume" title="Volumen de cuestionarios" description="Cantidad observada por periodo dentro del rango seleccionado." state={blocks.questionnaireVolume} />
                <SectionSeries sectionKey="questionnaireQuality" title="Calidad de respuestas" description="Señales de consistencia y completitud en las respuestas registradas." state={blocks.questionnaireQuality} />
            </section>

            <section className="dashboard-series-grid">
                <SectionSeries sectionKey="apiHealth" title="Estado de servicios" description="Disponibilidad operativa y comportamiento reciente de los servicios de la plataforma." state={blocks.apiHealth} />
                <SectionSeries sectionKey="dataQuality" title="Calidad de datos" description="Lectura compacta de completitud y consistencia del dato capturado." state={blocks.dataQuality} />
            </section>

            <section className="dashboard-insights-grid">
                <SectionMetric
                    title="Cambios en los datos"
                    description="Cambios recientes que podrían alterar la lectura habitual de los resultados."
                    state={blocks.drift}
                    mode="drift"
                />
                <SectionMetric
                    title="Equidad entre grupos"
                    description="Lectura resumida de diferencias observables entre segmentos comparables."
                    state={blocks.equity}
                    mode="equity"
                />
                <SectionMetric
                    title="Seguimiento de modelos"
                    description="Estado operativo del motor de evaluación y de la confianza agregada observada."
                    state={blocks.modelMonitoring}
                    mode="model"
                />
                <SectionMetric
                    title="Continuidad de uso"
                    description="Persistencia de uso y recurrencia de sesiones en el tiempo."
                    state={blocks.retention}
                    mode="retention"
                />
            </section>
        </div>
    );
}
