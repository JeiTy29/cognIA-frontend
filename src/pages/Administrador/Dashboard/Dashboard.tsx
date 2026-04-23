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
import './Dashboard.css';

const MONTH_OPTIONS = [1, 3, 6, 12, 24, 36, 60, 120].map((value) => ({
    value: String(value),
    label: `${value} mes${value === 1 ? '' : 'es'}`
}));

const LABEL_MAP: Record<string, string> = {
    volume_and_growth: 'Volumen y crecimiento',
    user_growth: 'Crecimiento de usuarios',
    conversion: 'Conversion',
    operational_capacity: 'Capacidad operativa',
    conversion_created_to_processed: 'Conversion de creados a procesados',
    created: 'Creados',
    submitted: 'Enviados',
    processed: 'Procesados',
    period: 'Periodo',
    value: 'Valor',
    confidence_pct: 'Confianza',
    alert_level: 'Nivel de alerta',
    result_summary: 'Resumen del resultado',
    combined_risk_score: 'Riesgo combinado',
    coexistence_level: 'Nivel de coexistencia',
    processed_sessions: 'Sesiones procesadas',
    registered_users: 'Usuarios registrados',
    processed_per_user: 'Procesadas por usuario',
    count: 'Total',
    month: 'Periodo',
    months: 'Meses'
};

function clampMonths(value: number) {
    if (!Number.isFinite(value)) return 12;
    const parsed = Math.trunc(value);
    if (parsed < 1) return 1;
    if (parsed > 120) return 120;
    return parsed;
}

function formatLabel(key: string) {
    const mapped = LABEL_MAP[key];
    if (mapped) return mapped;
    const normalized = key.replace(/_/g, ' ').replace(/\./g, ' ').trim();
    if (!normalized) return '--';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatPeriodLabel(period: string) {
    const normalized = period.trim();
    if (!normalized) return '--';

    const monthlyMatch = normalized.match(/^(\d{4})-(\d{2})$/);
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

function formatPrimitive(value: string | number | boolean | null) {
    if (value === null) return '--';
    if (typeof value === 'boolean') return value ? 'Si' : 'No';
    if (typeof value === 'number') {
        return Number.isInteger(value)
            ? new Intl.NumberFormat('es-CO').format(value)
            : new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(value);
    }
    return value.trim().length > 0 ? value : '--';
}

function formatSeriesValue(point: DashboardSeriesPoint) {
    if (point.raw_value !== null) {
        if (typeof point.raw_value === 'number') return formatPrimitive(point.raw_value);
        if (typeof point.raw_value === 'boolean') return point.raw_value ? 'Si' : 'No';
        const text = String(point.raw_value).trim();
        return text.length > 0 ? text : '--';
    }
    if (point.value === null) return '--';
    return formatPrimitive(point.value);
}

function formatConversion(value: number | null) {
    if (value === null) return '--';
    if (value <= 1) return `${(value * 100).toFixed(1)}%`;
    return `${value.toFixed(1)}%`;
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

function BlockError({ message, status }: { message: string; status: number | null }) {
    return (
        <div className="dashboard-block-error" role="status" aria-live="polite">
            <strong>No se pudo cargar este bloque</strong>
            <span>{message}</span>
            {status ? <small>HTTP {status}</small> : null}
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
    depth = 0
}: {
    node: DashboardMetricNode;
    depth?: number;
}) {
    if (depth > 4) return <span className="dashboard-node-value">--</span>;
    if (node === null || typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
        return <span className="dashboard-node-value">{formatPrimitive(node as string | number | boolean | null)}</span>;
    }

    if (Array.isArray(node)) {
        if (node.length === 0) return <span className="dashboard-node-value">--</span>;
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
                        <span key={`${String(item)}-${index}`} className="dashboard-node-chip">
                            {formatPrimitive(item as string | number | boolean | null)}
                        </span>
                    ))}
                </div>
            );
        }

        return (
            <div className="dashboard-node-array">
                {node.map((item, index) => (
                    <div className="dashboard-node-array-item" key={index}>
                        <MetricNodeView node={item} depth={depth + 1} />
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
                    <MetricNodeView node={value} depth={depth + 1} />
                </div>
            ))}
        </div>
    );
}

function SectionSeries({
    title,
    description,
    state
}: {
    title: string;
    description?: string;
    state: DashboardBlockState<DashboardSeriesResponse>;
}) {
    if (state.status === 'loading' || state.status === 'idle') return <BlockLoading />;
    if (state.status === 'error' && state.error) {
        return <BlockError message={state.error.message} status={state.error.status} />;
    }
    if (state.status === 'empty' || !state.data || state.data.series.length === 0) {
        return <p className="dashboard-empty">No hay datos para el rango seleccionado.</p>;
    }

    const sparklinePath = buildSparklinePath(state.data.series, 240, 46);

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
                    <div className="dashboard-table-row" key={`${point.period}-${index}`}>
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
}: {
    title: string;
    state: DashboardBlockState<DashboardFunnelResponse>;
}) {
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
                    <strong>{formatPrimitive(created)}</strong>
                </div>
                <div className="dashboard-funnel-row">
                    <span>Enviados</span>
                    <div className="dashboard-funnel-track"><i style={{ width: `${(submitted / max) * 100}%` }} /></div>
                    <strong>{formatPrimitive(submitted)}</strong>
                </div>
                <div className="dashboard-funnel-row">
                    <span>Procesados</span>
                    <div className="dashboard-funnel-track"><i style={{ width: `${(processed / max) * 100}%` }} /></div>
                    <strong>{formatPrimitive(processed)}</strong>
                </div>
            </div>
            <div className="dashboard-funnel-conversion">
                <span>Conversion de creados a procesados</span>
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
}: {
    title: string;
    description?: string;
    state: DashboardBlockState<DashboardAdoptionHistoryResponse>;
    prioritized?: boolean;
}) {
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
                    <MetricNodeView node={adoption.volume_and_growth} />
                </div>
                <div className="dashboard-adoption-item">
                    <h4>Crecimiento de usuarios</h4>
                    <MetricNodeView node={adoption.user_growth} />
                </div>
                <div className="dashboard-adoption-item">
                    <h4>Conversion</h4>
                    <MetricNodeView node={adoption.conversion} />
                </div>
                <div className="dashboard-adoption-item">
                    <h4>Capacidad operativa</h4>
                    <MetricNodeView node={adoption.operational_capacity} />
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
                    Algunos bloques requieren permisos adicionales para tu sesion actual.
                </div>
            ) : null}

            <SectionAdoption
                title="Resumen ejecutivo"
                description="Lectura general del rendimiento operativo y del uso reciente de la plataforma."
                state={blocks.executiveSummary}
                prioritized
            />
            <SectionAdoption
                title="Evolucion del uso de la plataforma"
                description="Seguimiento de volumen, crecimiento y capacidad operativa en el periodo seleccionado."
                state={blocks.adoptionHistory}
            />

            <section className="dashboard-funnel-grid">
                <SectionFunnel title="Embudo operativo" state={blocks.funnel} />
                <SectionFunnel title="Productividad" state={blocks.productivity} />
                <SectionFunnel title="Revision humana" state={blocks.humanReview} />
            </section>

            <SectionSeries
                title="Crecimiento de usuarios"
                description="Tendencia de nuevas altas y variacion del total de usuarios."
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
                    description="Analisis de consistencia y brechas observables entre segmentos de la poblacion."
                    state={blocks.equity}
                />
                <SectionAdoption
                    title="Monitoreo de modelos"
                    description="Seguimiento del desempeno y estabilidad de los modelos de apoyo."
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
