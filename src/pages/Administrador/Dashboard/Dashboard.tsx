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
import {
    formatNaturalValue,
    formatPercentEs,
    humanizeTechnicalKey
} from '../../../utils/presentation/naturalLanguage';
import './Dashboard.css';

const MONTH_OPTIONS = [1, 3, 6, 12, 24, 36, 60, 120].map((value) => ({
    value: String(value),
    label: `${value} mes${value === 1 ? '' : 'es'}`
}));

const LABEL_MAP: Record<string, string> = {
    volume_and_growth: 'Volumen y crecimiento',
    user_growth: 'Crecimiento de usuarios',
    conversion: 'Conversión',
    operational_capacity: 'Capacidad operativa',
    conversion_created_to_processed: 'Conversión de creados a procesados',
    created: 'Creados',
    submitted: 'Enviados',
    processed: 'Procesados',
    period: 'Periodo',
    value: 'Valor',
    count: 'Total',
    month: 'Periodo',
    months: 'Meses',
    processed_sessions: 'Sesiones procesadas',
    registered_users: 'Usuarios registrados',
    processed_per_user: 'Procesadas por usuario',
    confidence_pct: 'Nivel de confianza',
    alert_level: 'Nivel de alerta',
    result_summary: 'Resultado orientativo',
    combined_risk_score: 'Riesgo combinado',
    coexistence_level: 'Nivel de coexistencia'
};
type PrimitiveValue = string | number | boolean | null;
type BlockErrorProps = Readonly<{ message: string; status: number | null }>;
type MetricNodeViewProps = Readonly<{ node: DashboardMetricNode; keyName?: string; depth?: number }>;
type SectionSeriesProps = Readonly<{
    title: string;
    description?: string;
    state: DashboardBlockState<DashboardSeriesResponse>;
}>;
type SectionFunnelProps = Readonly<{
    title: string;
    state: DashboardBlockState<DashboardFunnelResponse>;
}>;
type SectionAdoptionProps = Readonly<{
    title: string;
    description?: string;
    state: DashboardBlockState<DashboardAdoptionHistoryResponse>;
    prioritized?: boolean;
}>;

function clampMonths(value: number) {
    if (!Number.isFinite(value)) return 12;
    const parsed = Math.trunc(value);
    if (parsed < 1) return 1;
    if (parsed > 120) return 120;
    return parsed;
}

function formatLabel(key: string) {
    const normalized = key.trim().toLowerCase();
    const mapped = LABEL_MAP[normalized];
    if (mapped) return mapped;
    return humanizeTechnicalKey(key);
}

function formatPeriodLabel(period: string) {
    const normalized = period.trim();
    if (!normalized) return '--';

    const monthlyMatch = /^(\d{4})-(\d{2})$/.exec(normalized);
    if (monthlyMatch) {
        const year = Number(monthlyMatch[1]);
        const month = Number(monthlyMatch[2]);
        if (Number.isFinite(year) && Number.isFinite(month)) {
            return new Intl.DateTimeFormat('es-CO', {
                month: 'long',
                year: 'numeric'
            }).format(new Date(year, month - 1, 1));
        }
    }

    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) {
        return new Intl.DateTimeFormat('es-CO', {
            dateStyle: 'medium'
        }).format(parsed);
    }

    return normalized;
}

function formatPrimitive(key: string, value: PrimitiveValue) {
    return formatNaturalValue(key, value, { includeTechnical: true });
}

function formatSeriesValue(point: DashboardSeriesPoint) {
    if (point.raw_value !== null) {
        return formatPrimitive('value', point.raw_value);
    }
    return formatPrimitive('value', point.value);
}

function formatConversion(value: number | null) {
    if (value === null) return '--';
    return formatPercentEs(value, { mode: 'auto' });
}

function buildSparklinePath(points: DashboardSeriesPoint[], width: number, height: number) {
    const numeric = points
        .map((point, index) => ({ index, value: point.value }))
        .filter((row): row is { index: number; value: number } => typeof row.value === 'number');
    if (numeric.length < 2) return '';

    const max = Math.max(...numeric.map((row) => row.value), 1);
    const min = Math.min(...numeric.map((row) => row.value), 0);
    const range = max - min || 1;
    const step = width / (numeric.length - 1);

    return numeric
        .map((row, index) => {
            const x = index * step;
            const normalized = (row.value - min) / range;
            const y = height - normalized * height;
            return `${index === 0 ? 'M' : 'L'}${x},${y}`;
        })
        .join(' ');
}

function buildStableCollectionKeys(items: unknown[], prefix: string) {
    const occurrences = new Map<string, number>();

    return items.map((item) => {
        const serialized =
            item === null || ['string', 'number', 'boolean'].includes(typeof item)
                ? String(item)
                : JSON.stringify(item);
        const baseKey = `${prefix}-${serialized}`;
        const nextCount = (occurrences.get(baseKey) ?? 0) + 1;
        occurrences.set(baseKey, nextCount);
        return `${baseKey}-${nextCount}`;
    });
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

function MetricNodeView({
    node,
    keyName = 'value',
    depth = 0
}: MetricNodeViewProps) {
    if (depth > 4) return <span className="dashboard-node-value">--</span>;
    if (node === null || typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
        return <span className="dashboard-node-value">{formatPrimitive(keyName, node)}</span>;
    }

    if (Array.isArray(node)) {
        if (node.length === 0) return <span className="dashboard-node-value">--</span>;
        const itemKeys = buildStableCollectionKeys(node, `${keyName}-${depth}`);
        const isPrimitive = node.every(
            (item) =>
                item === null ||
                typeof item === 'string' ||
                typeof item === 'number' ||
                typeof item === 'boolean'
        );
        if (isPrimitive) {
            return (
                <div className="dashboard-node-inline">
                    {node.map((item, index) => (
                        <span key={itemKeys[index]} className="dashboard-node-chip">
                            {formatPrimitive(keyName, item)}
                        </span>
                    ))}
                </div>
            );
        }

        return (
            <div className="dashboard-node-array">
                {node.map((item, index) => (
                    <div className="dashboard-node-array-item" key={itemKeys[index]}>
                        <MetricNodeView node={item} keyName={keyName} depth={depth + 1} />
                    </div>
                ))}
            </div>
        );
    }

    const entries = Object.entries(node);
    if (entries.length === 0) return <span className="dashboard-node-value">--</span>;

    return (
        <div className="dashboard-node-table">
            {entries.map(([key, value]) => (
                <div className="dashboard-node-row" key={key}>
                    <span className="dashboard-node-key">{formatLabel(key)}</span>
                    <MetricNodeView node={value} keyName={key} depth={depth + 1} />
                </div>
            ))}
        </div>
    );
}

function SectionSeries({
    title,
    description,
    state
}: SectionSeriesProps) {
    if (state.status === 'loading' || state.status === 'idle') return <BlockLoading />;
    if (state.status === 'error' && state.error) {
        return <BlockError message={state.error.message} status={state.error.status} />;
    }
    if (state.status === 'empty' || !state.data || state.data.series.length === 0) {
        return <p className="dashboard-empty">No hay datos para el rango seleccionado.</p>;
    }

    const sparklinePath = buildSparklinePath(state.data.series, 240, 46);
    const pointKeys = buildStableCollectionKeys(
        state.data.series.map((point) => `${point.period}-${String(point.value)}-${String(point.raw_value)}`),
        `${title}-series`
    );

    return (
        <div className="dashboard-series">
            <div className="dashboard-series-header">
                <div>
                    <h3>{title}</h3>
                    {description ? <p className="dashboard-section-description">{description}</p> : null}
                </div>
                {sparklinePath ? (
                    <svg className="dashboard-sparkline" viewBox="0 0 240 46" aria-label={`Tendencia de ${title}`}>
                        <path d={sparklinePath} />
                    </svg>
                ) : null}
            </div>
            <div className="dashboard-table compact">
                <div className="dashboard-table-row head">
                    <span>Periodo</span>
                    <span>Valor</span>
                </div>
                {state.data.series.map((point, index) => (
                    <div className="dashboard-table-row" key={pointKeys[index]}>
                        <span>{formatPeriodLabel(point.period)}</span>
                        <span>{formatSeriesValue(point)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SectionFunnel({
    title,
    state
}: SectionFunnelProps) {
    if (state.status === 'loading' || state.status === 'idle') return <BlockLoading />;
    if (state.status === 'error' && state.error) {
        return <BlockError message={state.error.message} status={state.error.status} />;
    }
    if (state.status === 'empty' || !state.data) {
        return <p className="dashboard-empty">No hay datos para el rango seleccionado.</p>;
    }

    const created = state.data.created ?? 0;
    const submitted = state.data.submitted ?? 0;
    const processed = state.data.processed ?? 0;
    const max = Math.max(created, submitted, processed, 1);

    return (
        <section className="dashboard-funnel-block">
            <div className="dashboard-section-title-row">
                <h3>{title}</h3>
            </div>
            <div className="dashboard-funnel-rows">
                <div className="dashboard-funnel-row">
                    <span>Creados</span>
                    <div className="dashboard-funnel-track"><i style={{ width: `${(created / max) * 100}%` }} /></div>
                    <strong>{formatPrimitive('created', created)}</strong>
                </div>
                <div className="dashboard-funnel-row">
                    <span>Enviados</span>
                    <div className="dashboard-funnel-track"><i style={{ width: `${(submitted / max) * 100}%` }} /></div>
                    <strong>{formatPrimitive('submitted', submitted)}</strong>
                </div>
                <div className="dashboard-funnel-row">
                    <span>Procesados</span>
                    <div className="dashboard-funnel-track"><i style={{ width: `${(processed / max) * 100}%` }} /></div>
                    <strong>{formatPrimitive('processed', processed)}</strong>
                </div>
            </div>
            <div className="dashboard-funnel-conversion">
                <span>Conversión de creados a procesados</span>
                <strong>{formatConversion(state.data.conversion_created_to_processed)}</strong>
            </div>
        </section>
    );
}

function SectionAdoption({
    title,
    description,
    state,
    prioritized = false
}: SectionAdoptionProps) {
    if (state.status === 'loading' || state.status === 'idle') return <BlockLoading />;
    if (state.status === 'error' && state.error) {
        return <BlockError message={state.error.message} status={state.error.status} />;
    }
    if (state.status === 'empty' || !state.data) {
        return <p className="dashboard-empty">No hay datos para el rango seleccionado.</p>;
    }

    const adoption = state.data.adoption_history;

    return (
        <section className={`dashboard-adoption ${prioritized ? 'is-prioritized' : ''}`}>
            <div className="dashboard-section-title-row">
                <div>
                    <h2>{title}</h2>
                    {description ? <p className="dashboard-section-description">{description}</p> : null}
                </div>
            </div>
            <div className="dashboard-adoption-grid">
                <div className="dashboard-adoption-item">
                    <h4>Volumen y crecimiento</h4>
                    <MetricNodeView node={adoption.volume_and_growth} keyName="volume_and_growth" />
                </div>
                <div className="dashboard-adoption-item">
                    <h4>Crecimiento de usuarios</h4>
                    <MetricNodeView node={adoption.user_growth} keyName="user_growth" />
                </div>
                <div className="dashboard-adoption-item">
                    <h4>Conversión</h4>
                    <MetricNodeView node={adoption.conversion} keyName="conversion" />
                </div>
                <div className="dashboard-adoption-item">
                    <h4>Capacidad operativa</h4>
                    <MetricNodeView node={adoption.operational_capacity} keyName="operational_capacity" />
                </div>
            </div>
        </section>
    );
}

export default function Dashboard() {
    const { months, setMonths, blocks, isReloading, reload } = useDashboard();
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
                    <h1>Dashboard</h1>
                    <p>Lectura ejecutiva y operativa del comportamiento de la plataforma.</p>
                </div>
                <div className="dashboard-controls">
                    <label>
                        Rango (meses)
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
                        Atajo
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

            <SectionAdoption
                title="Resumen ejecutivo"
                description="Lectura general del rendimiento operativo y del uso reciente de la plataforma."
                state={blocks.executiveSummary}
                prioritized
            />
            <SectionAdoption
                title="Evolución del uso de la plataforma"
                description="Seguimiento de volumen, crecimiento y capacidad operativa en el periodo seleccionado."
                state={blocks.adoptionHistory}
            />

            <section className="dashboard-funnel-grid">
                <SectionFunnel title="Embudo operativo" state={blocks.funnel} />
                <SectionFunnel title="Productividad" state={blocks.productivity} />
                <SectionFunnel title="Revisión humana" state={blocks.humanReview} />
            </section>

            <SectionSeries
                title="Crecimiento de usuarios"
                description="Tendencia de nuevas altas y variación del total de usuarios."
                state={blocks.userGrowth}
            />

            <section className="dashboard-series-grid">
                <SectionSeries title="Volumen de cuestionarios" state={blocks.questionnaireVolume} />
                <SectionSeries title="Calidad de cuestionarios" state={blocks.questionnaireQuality} />
            </section>

            <section className="dashboard-series-grid">
                <SectionSeries title="Salud de API" state={blocks.apiHealth} />
                <SectionSeries title="Calidad de datos" state={blocks.dataQuality} />
            </section>

            <section className="dashboard-adoption-grid-wide">
                <SectionAdoption
                    title="Cambios en el comportamiento de los datos"
                    description="Variaciones relevantes entre periodos que pueden impactar la lectura de resultados."
                    state={blocks.drift}
                />
                <SectionAdoption
                    title="Comparativas entre grupos"
                    description="Análisis de consistencia y brechas observables entre segmentos de la población."
                    state={blocks.equity}
                />
                <SectionAdoption
                    title="Monitoreo de modelos"
                    description="Seguimiento del desempeño y estabilidad de los modelos de apoyo."
                    state={blocks.modelMonitoring}
                />
                <SectionAdoption
                    title="Continuidad de uso"
                    description="Permanencia de usuarios y recurrencia de uso en el tiempo."
                    state={blocks.retention}
                />
            </section>
        </div>
    );
}
