import { useMemo, type ReactNode } from 'react';
import { getAlertLevelMeta } from '../../utils/dashboard/alerts';
import './DashboardCharts.css';

export interface DashboardChartItem {
    id?: string;
    label?: string;
    value?: number;
    tone?: string;
    [key: string]: unknown;
}

interface DashboardChartCardProps {
    title: string;
    description?: string;
    data: DashboardChartItem[];
    loading?: boolean;
    emptyText?: string;
    variant?: 'bars' | 'line';
}

interface DashboardSectionProps {
    title?: ReactNode;
    subtitle?: ReactNode;
    children?: ReactNode;
    [key: string]: unknown;
}

interface DashboardEmptyStateProps {
    message?: string;
}

interface DashboardMetricCardProps {
    label?: ReactNode;
    title?: ReactNode;
    value?: ReactNode;
    helper?: ReactNode;
    tone?: string;
    [key: string]: unknown;
}

interface CompatChartProps {
    data?: Array<Record<string, unknown>>;
    items?: Array<Record<string, unknown>>;
    ariaLabel?: string;
    formatter?: (value: number) => string;
    xLabelFormatter?: (value: string) => string;
    maxValue?: number;
    emptyMessage?: string;
    series?: Array<Record<string, unknown>>;
    [key: string]: unknown;
}

function formatCompact(value: number) {
    return new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function DashboardSkeleton() {
    return (
        <div className="dashboard-chart-skeleton" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
        </div>
    );
}

function BarChart({ data }: Readonly<{ data: DashboardChartItem[] }>) {
    const max = data.reduce((acc, item) => Math.max(acc, Number(item.value ?? 0)), 0);

    return (
        <div className="dashboard-chart-bars" role="list">
            {data.map((item) => {
                const numericValue = Number(item.value ?? 0);
                const percentage = max > 0 ? Math.round((numericValue / max) * 100) : 0;
                const toneMeta = getAlertLevelMeta(item.tone ?? null);
                return (
                    <div className="dashboard-chart-bar-row" key={String(item.id ?? item.label ?? percentage)} role="listitem">
                        <div className="dashboard-chart-bar-label" title={String(item.label ?? '--')}>{String(item.label ?? '--')}</div>
                        <div className="dashboard-chart-bar-track">
                            <i
                                style={{
                                    width: `${percentage}%`,
                                    backgroundColor: toneMeta.color
                                }}
                                aria-hidden="true"
                            />
                        </div>
                        <div className="dashboard-chart-bar-value">{formatCompact(numericValue)}</div>
                    </div>
                );
            })}
        </div>
    );
}

function BaseLineChart({ data }: Readonly<{ data: DashboardChartItem[] }>) {
    const coordinates = useMemo(() => {
        if (data.length === 0) return '';
        const max = data.reduce((acc, item) => Math.max(acc, Number(item.value ?? 0)), 0);
        return data
            .map((item, index) => {
                const x = (index / Math.max(data.length - 1, 1)) * 100;
                const y = max > 0 ? 100 - (Number(item.value ?? 0) / max) * 100 : 100;
                return `${x},${y}`;
            })
            .join(' ');
    }, [data]);

    return (
        <div className="dashboard-chart-line-wrap">
            <svg viewBox="0 0 100 100" className="dashboard-chart-line" aria-hidden="true">
                <polyline points={coordinates} />
            </svg>
            <div className="dashboard-chart-line-footer">
                {data.map((item) => (
                    <span key={String(item.id ?? item.label ?? '')} title={String(item.label ?? '--')}>{String(item.label ?? '--')}</span>
                ))}
            </div>
        </div>
    );
}

function toNumber(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function toChartItems(input?: Array<Record<string, unknown>>) {
    return (input ?? []).map((item, index) => ({
        id: String(item.id ?? item.key ?? item.name ?? item.label ?? index),
        label: String(item.label ?? item.name ?? item.key ?? `Item ${index + 1}`),
        value: toNumber(item.value ?? item.total ?? item.count ?? item.sessions),
        tone: typeof item.tone === 'string' ? item.tone : undefined
    }));
}

function CompatChart({
    data,
    items,
    ariaLabel,
    formatter,
    emptyMessage,
    series
}: Readonly<CompatChartProps>) {
    const normalizedData = toChartItems(data ?? items);
    const variant = Array.isArray(series) && series.length > 0 ? 'line' : 'bars';
    return (
        <DashboardChartCard
            title={ariaLabel ?? 'Grafica'}
            data={normalizedData}
            emptyText={emptyMessage ?? 'No hay datos disponibles.'}
            description={formatter ? 'Valores formateados por configuracion de vista.' : undefined}
            variant={variant}
        />
    );
}

export function DashboardSection({ title, subtitle, children }: Readonly<DashboardSectionProps>) {
    return (
        <section className="dashboard-chart-card">
            {(title || subtitle) ? (
                <header>
                    {title ? <h3>{title}</h3> : null}
                    {subtitle ? <p>{subtitle}</p> : null}
                </header>
            ) : null}
            {children}
        </section>
    );
}

export function DashboardEmptyState({ message = 'No hay datos disponibles.' }: Readonly<DashboardEmptyStateProps>) {
    return <p className="dashboard-chart-empty">{message}</p>;
}

export function DashboardMetricCard({ label, title, value, helper }: Readonly<DashboardMetricCardProps>) {
    return (
        <article className="historial-dashboard-kpi-card">
            <span>{label ?? title ?? 'Metrica'}</span>
            <strong>{value ?? '--'}</strong>
            {helper ? <small>{helper}</small> : null}
        </article>
    );
}

export function AreaChart(props: Readonly<CompatChartProps>) {
    return <CompatChart {...props} />;
}

export function DonutChart(props: Readonly<CompatChartProps>) {
    return <CompatChart {...props} />;
}

export function HeatmapChart(props: Readonly<CompatChartProps>) {
    return <CompatChart {...props} />;
}

export function TimelineChart(props: Readonly<CompatChartProps>) {
    return <CompatChart {...props} />;
}

export function LineChart(props: Readonly<CompatChartProps>) {
    return <CompatChart {...props} series={props.series ?? [{ key: 'line' }]} />;
}

export function TreemapChart(props: Readonly<CompatChartProps>) {
    return <CompatChart {...props} />;
}

export function HorizontalBarChart(props: Readonly<CompatChartProps>) {
    return <CompatChart {...props} />;
}

export function WaffleChart(props: Readonly<CompatChartProps>) {
    return <CompatChart {...props} />;
}

export function HistogramChart(props: Readonly<CompatChartProps>) {
    return <CompatChart {...props} />;
}

export function MatrixAvailabilityChart(props: Readonly<CompatChartProps>) {
    return <CompatChart {...props} />;
}

export function DivergingDeltaChart(props: Readonly<CompatChartProps>) {
    return <CompatChart {...props} />;
}

export function DashboardChartCard({
    title,
    description,
    data,
    loading = false,
    emptyText = 'No hay datos para los filtros seleccionados.',
    variant = 'bars'
}: Readonly<DashboardChartCardProps>) {
    return (
        <article className="dashboard-chart-card" aria-label={title}>
            <header>
                <h3>{title}</h3>
                {description ? <p>{description}</p> : null}
            </header>
            {loading ? <DashboardSkeleton /> : null}
            {!loading && data.length === 0 ? <p className="dashboard-chart-empty">{emptyText}</p> : null}
            {!loading && data.length > 0 && variant === 'bars' ? <BarChart data={data} /> : null}
            {!loading && data.length > 0 && variant === 'line' ? <BaseLineChart data={data} /> : null}
        </article>
    );
}
