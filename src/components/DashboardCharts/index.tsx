import { useMemo, useState, type ReactNode } from 'react';
import './DashboardCharts.css';
import { createLinearTicks, getLabelStride, getSymmetricExtent, sumValues } from '../../utils/dashboard/chartScales';
import { formatChartCount, formatChartDate, formatChartPercent, formatShortDate, formatShortDateTime, truncateChartLabel } from '../../utils/dashboard/chartFormatters';

export const DEFAULT_DASHBOARD_EMPTY_MESSAGE = 'No hay datos suficientes para generar esta gráfica en el periodo seleccionado.';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export type DashboardChartDatum = {
    label: string;
    value: number;
    color?: string;
    meta?: string;
};

export type DashboardSeriesDefinition = {
    key: string;
    label: string;
    color: string;
};

export type DashboardSeriesPoint = {
    label: string;
    values: Record<string, number | null | undefined>;
    meta?: string;
};

type DashboardSectionProps = Readonly<{
    title: string;
    description: string;
    note?: string | null;
    children: ReactNode;
    className?: string;
}>;

type DashboardEmptyStateProps = Readonly<{
    message?: string;
    helper?: string;
}>;

type DashboardMetricCardProps = Readonly<{
    label: string;
    value: ReactNode;
    helper?: string;
    tone?: Tone;
}>;

type DonutChartProps = Readonly<{
    data: DashboardChartDatum[];
    ariaLabel: string;
    emptyMessage?: string;
    formatter?: (value: number) => string;
}>;

type HorizontalBarChartProps = Readonly<{
    data: DashboardChartDatum[];
    ariaLabel: string;
    emptyMessage?: string;
    formatter?: (value: number) => string;
    maxValue?: number;
    minValue?: number;
}>;

type DivergingDeltaChartProps = Readonly<{
    data: DashboardChartDatum[];
    ariaLabel: string;
    emptyMessage?: string;
    formatter?: (value: number) => string;
    helper?: string;
}>;

type VerticalBarChartProps = Readonly<{
    data: DashboardChartDatum[];
    ariaLabel: string;
    emptyMessage?: string;
    formatter?: (value: number) => string;
    maxValue?: number;
    minValue?: number;
}>;

type LineChartProps = Readonly<{
    data: DashboardSeriesPoint[];
    series: DashboardSeriesDefinition[];
    ariaLabel: string;
    emptyMessage?: string;
    minY?: number;
    maxY?: number;
    formatter?: (value: number) => string;
    xLabelFormatter?: (value: string) => string;
}>;

type AreaChartProps = Readonly<{
    data: DashboardChartDatum[];
    ariaLabel: string;
    emptyMessage?: string;
    formatter?: (value: number) => string;
    xLabelFormatter?: (value: string) => string;
}>;

type StackedBarChartProps = Readonly<{
    categories: Array<{
        label: string;
        segments: DashboardChartDatum[];
    }>;
    ariaLabel: string;
    emptyMessage?: string;
    formatter?: (value: number) => string;
}>;

type HeatmapChartProps = Readonly<{
    rows: string[];
    columns: string[];
    cells: Array<{ row: string; column: string; value: number }>;
    ariaLabel: string;
    emptyMessage?: string;
}>;

type HistogramChartProps = Readonly<{
    data: DashboardChartDatum[];
    ariaLabel: string;
    emptyMessage?: string;
    formatter?: (value: number) => string;
}>;

type TimelineChartProps = Readonly<{
    items: Array<{
        date: string;
        title: string;
        description?: string;
        tone?: Tone;
    }>;
    ariaLabel: string;
    emptyMessage?: string;
}>;

type TreemapChartProps = Readonly<{
    data: DashboardChartDatum[];
    ariaLabel: string;
    emptyMessage?: string;
    formatter?: (value: number) => string;
}>;

type WaffleChartProps = Readonly<{
    data: DashboardChartDatum[];
    ariaLabel: string;
    emptyMessage?: string;
    totalCells?: number;
}>;

type FunnelChartProps = Readonly<{
    data: DashboardChartDatum[];
    ariaLabel: string;
    emptyMessage?: string;
    formatter?: (value: number) => string;
}>;

type MatrixAvailabilityChartProps = Readonly<{
    rows: string[];
    columns: string[];
    values: Array<{ row: string; column: string; status: 'available' | 'partial' | 'unavailable'; label: string }>;
    ariaLabel: string;
    emptyMessage?: string;
}>;

const DEFAULT_PALETTE = ['#0f5f9f', '#1f9d55', '#f0ad4e', '#dc3545', '#6a6f7d', '#7c3aed', '#0ea5e9'];

function resolveColor(index: number, explicit?: string) {
    return explicit ?? DEFAULT_PALETTE[index % DEFAULT_PALETTE.length];
}

function resolveLinePattern(index: number) {
    const patterns = ['', '7 4', '3 3', '10 4 2 4', '2 5'];
    return patterns[index % patterns.length];
}

function getToneFromValue(value: number): Tone {
    if (value < 0) return 'danger';
    if (value === 0) return 'neutral';
    return 'info';
}

function renderEmpty(message?: string) {
    return <DashboardEmptyState message={message} />;
}

export function DashboardSection({ title, description, note, children, className }: DashboardSectionProps) {
    return (
        <section className={className ? `dashboard-chart-section ${className}` : 'dashboard-chart-section'}>
            <header className="dashboard-chart-section__header">
                <h2>{title}</h2>
                <p>{description}</p>
                {note ? <span className="dashboard-chart-note">{note}</span> : null}
            </header>
            {children}
        </section>
    );
}

export function DashboardEmptyState({ message = DEFAULT_DASHBOARD_EMPTY_MESSAGE, helper }: DashboardEmptyStateProps) {
    return (
        <div className="dashboard-chart-empty">
            <strong>Sin datos para graficar</strong>
            <p>{message}</p>
            {helper ? <p>{helper}</p> : null}
        </div>
    );
}

export function DashboardMetricCard({ label, value, helper, tone = 'neutral' }: DashboardMetricCardProps) {
    return (
        <article className="dashboard-chart-metric-card" data-tone={tone}>
            <strong>{label}</strong>
            <span>{value}</span>
            {helper ? <small>{helper}</small> : null}
        </article>
    );
}

export function DonutChart({ data, ariaLabel, emptyMessage, formatter = formatChartCount }: DonutChartProps) {
    const sanitized = data.filter((item) => Number.isFinite(item.value) && item.value > 0);
    const total = sumValues(sanitized.map((item) => item.value));
    const radius = 48;
    const circumference = 2 * Math.PI * radius;
    const segments = sanitized.map((item) => (item.value / total) * circumference);
    const offsets = segments.map((_, index) => sumValues(segments.slice(0, index)));

    if (sanitized.length === 0 || total <= 0) return renderEmpty(emptyMessage);

    return (
        <div className="dashboard-chart-svg-wrap">
            <svg className="dashboard-chart-svg" viewBox="0 0 220 220" role="img" aria-label={ariaLabel}>
                <circle cx="110" cy="110" r={radius} fill="none" stroke="#e5eef7" strokeWidth="22" />
                {sanitized.map((item, index) => {
                    const color = resolveColor(index, item.color);
                    const segment = segments[index] ?? 0;
                    const dashArray = `${segment} ${circumference - segment}`;
                    const dashOffset = -(offsets[index] ?? 0);

                    return (
                        <circle
                            key={`${item.label}-${index}`}
                            cx="110"
                            cy="110"
                            r={radius}
                            fill="none"
                            stroke={color}
                            strokeWidth="22"
                            strokeDasharray={dashArray}
                            strokeDashoffset={dashOffset}
                            transform="rotate(-90 110 110)"
                        >
                            <title>{`${item.label}: ${formatter(item.value)}`}</title>
                        </circle>
                    );
                })}
                <circle cx="110" cy="110" r="28" fill="#ffffff" />
                <text x="110" y="103" textAnchor="middle" fontSize="12" fill="#526476">Total</text>
                <text x="110" y="120" textAnchor="middle" fontSize="20" fontWeight="700" fill="#0b2540">{formatter(total)}</text>
            </svg>
            <div className="dashboard-chart-legend">
                {sanitized.map((item, index) => (
                    <span key={`${item.label}-legend`} className="dashboard-chart-legend-item">
                        <i className="dashboard-chart-legend-swatch" style={{ backgroundColor: resolveColor(index, item.color) }} />
                        {item.label}: {formatter(item.value)}
                    </span>
                ))}
            </div>
        </div>
    );
}

export function HorizontalBarChart({
    data,
    ariaLabel,
    emptyMessage,
    formatter = formatChartPercent,
    maxValue = 100,
    minValue = 0
}: HorizontalBarChartProps) {
    const sanitized = data.filter((item) => Number.isFinite(item.value));
    if (sanitized.length === 0) return renderEmpty(emptyMessage);

    const hasNegative = minValue < 0;
    const extent = hasNegative ? Math.max(Math.abs(minValue), Math.abs(maxValue)) : maxValue;

    return (
        <div className="dashboard-chart-bar-list" role="img" aria-label={ariaLabel}>
            {sanitized.map((item, index) => {
                const clampedValue = Math.max(minValue, Math.min(maxValue, item.value));
                const tone = getToneFromValue(clampedValue);
                const width = hasNegative
                    ? `${(Math.abs(clampedValue) / extent) * 50}%`
                    : `${(Math.max(0, clampedValue) / Math.max(1, maxValue)) * 100}%`;
                const left = hasNegative
                    ? clampedValue < 0
                        ? `${50 - (Math.abs(clampedValue) / extent) * 50}%`
                        : '50%'
                    : '0';

                return (
                    <div key={`${item.label}-${index}`} className="dashboard-chart-bar-row">
                        <span className="dashboard-chart-bar-label" title={item.label}>{truncateChartLabel(item.label, 34)}</span>
                        <div className="dashboard-chart-bar-track">
                            {hasNegative ? <span className="dashboard-chart-bar-axis" style={{ left: '50%' }} /> : null}
                            <span
                                className="dashboard-chart-bar-fill"
                                data-tone={tone}
                                style={{ width, left }}
                                title={`${item.label}: ${formatter(clampedValue)}`}
                            />
                        </div>
                        <span className="dashboard-chart-bar-value">{formatter(clampedValue)}</span>
                    </div>
                );
            })}
        </div>
    );
}

export function DivergingDeltaChart({
    data,
    ariaLabel,
    emptyMessage,
    formatter = formatChartPercent,
    helper
}: DivergingDeltaChartProps) {
    const sanitized = data.filter((item) => Number.isFinite(item.value));
    if (sanitized.length === 0) return renderEmpty(emptyMessage);

    const extent = getSymmetricExtent(sanitized.map((item) => item.value), 100);

    return (
        <div className="dashboard-chart-delta-wrap">
            <div className="dashboard-chart-delta-list" role="img" aria-label={ariaLabel}>
                {sanitized.map((item, index) => {
                    const clampedValue = Math.max(-extent, Math.min(extent, item.value));
                    const width = `${(Math.abs(clampedValue) / Math.max(1, extent)) * 50}%`;
                    const left = clampedValue < 0 ? `${50 - (Math.abs(clampedValue) / Math.max(1, extent)) * 50}%` : '50%';
                    const tone = getToneFromValue(clampedValue);
                    const valueLabel = clampedValue === 0 ? 'Sin cambio' : `${clampedValue > 0 ? '+' : ''}${formatter(clampedValue)}`;

                    return (
                        <div key={`${item.label}-${index}`} className="dashboard-chart-delta-row">
                            <span className="dashboard-chart-delta-label" title={item.label}>{truncateChartLabel(item.label, 30)}</span>
                            <div className="dashboard-chart-delta-track">
                                <span className="dashboard-chart-delta-axis" />
                                <span
                                    className="dashboard-chart-delta-fill"
                                    data-tone={tone}
                                    style={{ width, left }}
                                    title={`${item.label}: ${valueLabel}`}
                                />
                            </div>
                            <span className="dashboard-chart-delta-value">{valueLabel}</span>
                        </div>
                    );
                })}
            </div>
            {helper ? <p className="dashboard-chart-delta-helper">{helper}</p> : null}
        </div>
    );
}

export function VerticalBarChart({
    data,
    ariaLabel,
    emptyMessage,
    formatter = formatChartCount,
    maxValue,
    minValue = 0
}: VerticalBarChartProps) {
    const sanitized = data.filter((item) => Number.isFinite(item.value));
    if (sanitized.length === 0) return renderEmpty(emptyMessage);

    const hasNegative = minValue < 0;
    const resolvedMax = typeof maxValue === 'number' ? maxValue : Math.max(...sanitized.map((item) => item.value), 0);
    const resolvedExtent = hasNegative ? Math.max(Math.abs(minValue), Math.abs(resolvedMax)) : Math.max(1, resolvedMax);
    const baselineY = hasNegative ? 110 : 200;
    const labelStride = getLabelStride(sanitized.length, 7);

    return (
        <div className="dashboard-chart-svg-wrap">
            <svg className="dashboard-chart-svg" viewBox="0 0 420 240" role="img" aria-label={ariaLabel}>
                <line x1="40" y1={baselineY} x2="390" y2={baselineY} stroke="#d5deea" strokeWidth="1" />
                {sanitized.map((item, index) => {
                    const barWidth = Math.max(12, 300 / sanitized.length);
                    const gap = Math.max(6, 340 / sanitized.length - barWidth);
                    const x = 50 + index * (barWidth + gap);
                    const normalizedHeight = (Math.abs(item.value) / resolvedExtent) * (hasNegative ? 90 : 150);
                    const y = hasNegative
                        ? item.value >= 0
                            ? baselineY - normalizedHeight
                            : baselineY
                        : baselineY - normalizedHeight;

                    return (
                        <g key={`${item.label}-${index}`}>
                            <rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={normalizedHeight}
                                rx="8"
                                fill={resolveColor(index, item.color)}
                            >
                                <title>{`${item.label}: ${formatter(item.value)}`}</title>
                            </rect>
                            <text x={x + barWidth / 2} y={hasNegative ? 228 : 220} textAnchor="middle" fontSize="10" fill="#526476">
                                {index % labelStride === 0 ? truncateChartLabel(item.label, 12) : ''}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

function buildSeriesPath(
    points: Array<{ x: number; y: number }>
) {
    return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
}

export function LineChart({
    data,
    series,
    ariaLabel,
    emptyMessage,
    minY = 0,
    maxY = 100,
    formatter = formatChartPercent,
    xLabelFormatter = formatShortDateTime
}: LineChartProps) {
    const [hiddenSeriesKeys, setHiddenSeriesKeys] = useState<string[]>([]);
    const [hoveredSeriesKey, setHoveredSeriesKey] = useState<string | null>(null);
    const visibleSeries = useMemo(
        () => series.filter((line) => !hiddenSeriesKeys.includes(line.key)),
        [hiddenSeriesKeys, series]
    );

    if (data.length < 2 || series.length === 0) return renderEmpty(emptyMessage);

    if (visibleSeries.length === 0) {
        return renderEmpty('Activa al menos un dominio para visualizar la evolución.');
    }

    const ticks = createLinearTicks(minY, maxY, 5);
    const labelStride = getLabelStride(data.length, 6);
    const chartLeft = 44;
    const chartTop = 18;
    const chartWidth = 360;
    const chartHeight = 170;

    return (
        <div className="dashboard-chart-svg-wrap">
            <svg className="dashboard-chart-svg" viewBox="0 0 440 250" role="img" aria-label={ariaLabel}>
                {ticks.map((tick) => {
                    const y = chartTop + chartHeight - ((tick - minY) / Math.max(1, maxY - minY)) * chartHeight;
                    return (
                        <g key={`tick-${tick}`}>
                            <line x1={chartLeft} y1={y} x2={chartLeft + chartWidth} y2={y} stroke="#eef3f8" strokeWidth="1" />
                            <text x={chartLeft - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#526476">
                                {formatter(tick)}
                            </text>
                        </g>
                    );
                })}

                {visibleSeries.map((line, seriesIndex) => {
                    const points = data.map((point, pointIndex) => {
                        const raw = point.values[line.key];
                        const numeric = typeof raw === 'number' ? raw : Number(raw);
                        const safeValue = Number.isFinite(numeric) ? numeric : minY;
                        return {
                            x: chartLeft + (pointIndex / Math.max(1, data.length - 1)) * chartWidth,
                            y: chartTop + chartHeight - ((safeValue - minY) / Math.max(1, maxY - minY)) * chartHeight
                        };
                    });

                    return (
                        <g key={line.key}>
                            <path
                                d={buildSeriesPath(points)}
                                fill="none"
                                stroke={resolveColor(seriesIndex, line.color)}
                                strokeWidth={hoveredSeriesKey === line.key ? '4' : '3'}
                                strokeDasharray={resolveLinePattern(seriesIndex)}
                                strokeLinecap="round"
                                opacity={hoveredSeriesKey && hoveredSeriesKey !== line.key ? 0.22 : 1}
                            />
                            {points.map((point, pointIndex) => (
                                <circle
                                    key={`${line.key}-${pointIndex}`}
                                    cx={point.x}
                                    cy={point.y}
                                    r={hoveredSeriesKey === line.key ? '4.5' : '4'}
                                    fill={resolveColor(seriesIndex, line.color)}
                                    stroke="#ffffff"
                                    strokeWidth="1.5"
                                    opacity={hoveredSeriesKey && hoveredSeriesKey !== line.key ? 0.24 : 1}
                                >
                                    <title>{`${line.label} · ${xLabelFormatter(data[pointIndex].label)}: ${formatter(Number(data[pointIndex].values[line.key] ?? 0))}`}</title>
                                </circle>
                            ))}
                        </g>
                    );
                })}

                {data.map((point, index) => {
                    const x = chartLeft + (index / Math.max(1, data.length - 1)) * chartWidth;
                    const previousX = index === 0 ? chartLeft : chartLeft + ((index - 1) / Math.max(1, data.length - 1)) * chartWidth;
                    const nextX = index === data.length - 1 ? chartLeft + chartWidth : chartLeft + ((index + 1) / Math.max(1, data.length - 1)) * chartWidth;
                    const hotspotWidth = Math.max(14, (nextX - previousX) / 2);
                    const visibleSummary = visibleSeries
                        .map((line) => {
                            const raw = point.values[line.key];
                            const numeric = typeof raw === 'number' ? raw : Number(raw);
                            return Number.isFinite(numeric) ? `${line.label}: ${formatter(numeric)}` : null;
                        })
                        .filter((entry): entry is string => Boolean(entry));

                    return (
                        <rect
                            key={`hotspot-${point.label}-${index}`}
                            x={Math.max(chartLeft, x - hotspotWidth / 2)}
                            y={chartTop}
                            width={Math.min(hotspotWidth, chartLeft + chartWidth - Math.max(chartLeft, x - hotspotWidth / 2))}
                            height={chartHeight}
                            fill="transparent"
                        >
                            <title>{`${xLabelFormatter(point.label)}\n${visibleSummary.join('\n')}`}</title>
                        </rect>
                    );
                })}

                {data.map((point, index) => {
                    const x = chartLeft + (index / Math.max(1, data.length - 1)) * chartWidth;
                    return (
                        <text key={`xlabel-${point.label}-${index}`} x={x} y="232" textAnchor="middle" fontSize="10" fill="#526476">
                            {index % labelStride === 0 ? xLabelFormatter(point.label) : ''}
                        </text>
                    );
                })}
            </svg>
            <div className="dashboard-chart-legend">
                {series.map((line, index) => (
                    <button
                        key={`${line.key}-legend`}
                        type="button"
                        className="dashboard-chart-legend-item dashboard-chart-legend-button"
                        data-active={!hiddenSeriesKeys.includes(line.key)}
                        onClick={() =>
                            setHiddenSeriesKeys((current) =>
                                current.includes(line.key)
                                    ? current.filter((key) => key !== line.key)
                                    : [...current, line.key]
                            )
                        }
                        onMouseEnter={() => setHoveredSeriesKey(line.key)}
                        onMouseLeave={() => setHoveredSeriesKey(null)}
                        title={hiddenSeriesKeys.includes(line.key) ? `Mostrar ${line.label}` : `Ocultar ${line.label}`}
                    >
                        <i
                            className="dashboard-chart-legend-swatch"
                            style={{
                                backgroundColor: resolveColor(index, line.color),
                                borderStyle: resolveLinePattern(index) ? 'dashed' : 'solid'
                            }}
                        />
                        {line.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

export function AreaChart({
    data,
    ariaLabel,
    emptyMessage,
    formatter = formatChartCount,
    xLabelFormatter = formatShortDate
}: AreaChartProps) {
    if (data.length < 2) return renderEmpty(emptyMessage);

    const maxValue = Math.max(...data.map((item) => item.value), 0);
    const ticks = createLinearTicks(0, Math.max(1, maxValue), 4);
    const chartLeft = 44;
    const chartTop = 18;
    const chartWidth = 360;
    const chartHeight = 170;
    const labelStride = getLabelStride(data.length, 6);

    const points = data.map((item, index) => ({
        x: chartLeft + (index / Math.max(1, data.length - 1)) * chartWidth,
        y: chartTop + chartHeight - (item.value / Math.max(1, maxValue)) * chartHeight
    }));
    const path = buildSeriesPath(points);
    const areaPath = `${path} L ${chartLeft + chartWidth} ${chartTop + chartHeight} L ${chartLeft} ${chartTop + chartHeight} Z`;

    return (
        <div className="dashboard-chart-svg-wrap">
            <svg className="dashboard-chart-svg" viewBox="0 0 440 250" role="img" aria-label={ariaLabel}>
                {ticks.map((tick) => {
                    const y = chartTop + chartHeight - (tick / Math.max(1, maxValue)) * chartHeight;
                    return (
                        <g key={`area-tick-${tick}`}>
                            <line x1={chartLeft} y1={y} x2={chartLeft + chartWidth} y2={y} stroke="#eef3f8" strokeWidth="1" />
                            <text x={chartLeft - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#526476">
                                {formatter(tick)}
                            </text>
                        </g>
                    );
                })}
                <path d={areaPath} fill="rgba(15,95,159,0.14)" />
                <path d={path} fill="none" stroke="#0f5f9f" strokeWidth="3" strokeLinecap="round" />
                {points.map((point, index) => (
                    <circle key={`${data[index].label}-${index}`} cx={point.x} cy={point.y} r="3" fill="#0f5f9f">
                        <title>{`${xLabelFormatter(data[index].label)}: ${formatter(data[index].value)}`}</title>
                    </circle>
                ))}
                {data.map((item, index) => {
                    const x = chartLeft + (index / Math.max(1, data.length - 1)) * chartWidth;
                    return (
                        <text key={`area-label-${item.label}-${index}`} x={x} y="232" textAnchor="middle" fontSize="10" fill="#526476">
                            {index % labelStride === 0 ? xLabelFormatter(item.label) : ''}
                        </text>
                    );
                })}
            </svg>
        </div>
    );
}

export function StackedBarChart({
    categories,
    ariaLabel,
    emptyMessage,
    formatter = formatChartCount
}: StackedBarChartProps) {
    const sanitized = categories.filter((category) => category.segments.some((segment) => segment.value > 0));
    if (sanitized.length === 0) return renderEmpty(emptyMessage);
    const maxTotal = Math.max(...sanitized.map((category) => sumValues(category.segments.map((segment) => segment.value))), 1);

    return (
        <div className="dashboard-chart-bar-list" role="img" aria-label={ariaLabel}>
            {sanitized.map((category) => {
                const total = sumValues(category.segments.map((segment) => segment.value));
                let offset = 0;
                return (
                    <div key={category.label} className="dashboard-chart-bar-row">
                        <span className="dashboard-chart-bar-label">{truncateChartLabel(category.label, 28)}</span>
                        <div className="dashboard-chart-bar-track">
                            {category.segments.map((segment, index) => {
                                const width = `${(segment.value / Math.max(1, maxTotal)) * 100}%`;
                                const left = `${(offset / Math.max(1, maxTotal)) * 100}%`;
                                offset += segment.value;
                                return (
                                    <span
                                        key={`${category.label}-${segment.label}`}
                                        className="dashboard-chart-bar-fill"
                                        style={{
                                            width,
                                            left,
                                            background: resolveColor(index, segment.color)
                                        }}
                                        title={`${category.label} · ${segment.label}: ${formatter(segment.value)}`}
                                    />
                                );
                            })}
                        </div>
                        <span className="dashboard-chart-bar-value">{formatter(total)}</span>
                    </div>
                );
            })}
        </div>
    );
}

export function HeatmapChart({ rows, columns, cells, ariaLabel, emptyMessage }: HeatmapChartProps) {
    if (rows.length === 0 || columns.length === 0 || cells.length === 0) return renderEmpty(emptyMessage);
    const maxValue = Math.max(...cells.map((cell) => cell.value), 0);
    if (maxValue <= 0) return renderEmpty(emptyMessage);

    return (
        <div className="dashboard-chart-heatmap-table" role="img" aria-label={ariaLabel}>
            <div
                className="dashboard-chart-heatmap-head"
                style={{ gridTemplateColumns: `minmax(110px, 140px) repeat(${columns.length}, minmax(0, 1fr))` }}
            >
                <span />
                {columns.map((column) => (
                    <span key={column} className="dashboard-chart-axis-label">{truncateChartLabel(column, 18)}</span>
                ))}
            </div>
            {rows.map((row) => (
                <div
                    key={row}
                    className="dashboard-chart-heatmap-row"
                    style={{ gridTemplateColumns: `minmax(110px, 140px) repeat(${columns.length}, minmax(0, 1fr))` }}
                >
                    <span className="dashboard-chart-heatmap-label">{truncateChartLabel(row, 18)}</span>
                    {columns.map((column) => {
                        const cell = cells.find((entry) => entry.row === row && entry.column === column) ?? { value: 0 };
                        const alpha = Math.max(0.12, maxValue > 0 ? cell.value / maxValue : 0);
                        return (
                            <div
                                key={`${row}-${column}`}
                                className="dashboard-chart-heatmap-cell"
                                style={{ backgroundColor: `rgba(15,95,159,${alpha})` }}
                                title={`${row} · ${column}: ${formatChartCount(cell.value)}`}
                            >
                                {formatChartCount(cell.value)}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

export function HistogramChart({ data, ariaLabel, emptyMessage, formatter = formatChartCount }: HistogramChartProps) {
    return (
        <VerticalBarChart
            data={data}
            ariaLabel={ariaLabel}
            emptyMessage={emptyMessage}
            formatter={formatter}
            minValue={0}
        />
    );
}

export function TimelineChart({ items, ariaLabel, emptyMessage }: TimelineChartProps) {
    if (items.length === 0) return renderEmpty(emptyMessage);

    return (
        <div className="dashboard-chart-timeline" role="img" aria-label={ariaLabel}>
            {items.map((item, index) => (
                <div key={`${item.date}-${item.title}-${index}`} className="dashboard-chart-timeline-item">
                    <span className="dashboard-chart-timeline-dot" data-tone={item.tone ?? 'neutral'} />
                    <div>
                        <div className="dashboard-chart-timeline-title">{item.title}</div>
                        <div className="dashboard-chart-timeline-meta">{formatChartDate(item.date)}</div>
                        {item.description ? <div className="dashboard-chart-timeline-meta">{item.description}</div> : null}
                    </div>
                </div>
            ))}
        </div>
    );
}

export function TreemapChart({ data, ariaLabel, emptyMessage, formatter = formatChartCount }: TreemapChartProps) {
    const sanitized = data.filter((item) => Number.isFinite(item.value) && item.value > 0);
    if (sanitized.length === 0) return renderEmpty(emptyMessage);

    return (
        <div className="dashboard-chart-treemap" role="img" aria-label={ariaLabel}>
            {sanitized.map((item, index) => (
                <div
                    key={`${item.label}-${index}`}
                    className="dashboard-chart-treemap-tile"
                    style={{
                        flexGrow: Math.max(1, item.value),
                        background: `linear-gradient(180deg, ${resolveColor(index, item.color)}22 0%, ${resolveColor(index, item.color)}10 100%)`,
                        borderColor: `${resolveColor(index, item.color)}40`
                    }}
                    title={`${item.label}: ${formatter(item.value)}`}
                >
                    <strong>{truncateChartLabel(item.label, 32)}</strong>
                    <span>{formatter(item.value)}</span>
                    {item.meta ? <small className="dashboard-chart-treemap-note">{item.meta}</small> : null}
                </div>
            ))}
        </div>
    );
}

export function WaffleChart({ data, ariaLabel, emptyMessage, totalCells = 100 }: WaffleChartProps) {
    const sanitized = data.filter((item) => Number.isFinite(item.value) && item.value > 0);
    const total = sumValues(sanitized.map((item) => item.value));
    if (sanitized.length === 0 || total <= 0) return renderEmpty(emptyMessage);

    const cells = sanitized.flatMap((item, index) => {
        const amount = Math.round((item.value / total) * totalCells);
        return Array.from({ length: amount }, (_, cellIndex) => ({
            key: `${item.label}-${cellIndex}`,
            color: resolveColor(index, item.color),
            label: item.label
        }));
    }).slice(0, totalCells);

    while (cells.length < totalCells) {
        cells.push({ key: `empty-${cells.length}`, color: 'rgba(82,100,118,0.16)', label: 'Sin datos' });
    }

    return (
        <div>
            <div className="dashboard-chart-waffle" role="img" aria-label={ariaLabel}>
                {cells.map((cell) => (
                    <span
                        key={cell.key}
                        className="dashboard-chart-waffle-cell"
                        style={{ backgroundColor: cell.color }}
                        title={cell.label}
                    />
                ))}
            </div>
            <div className="dashboard-chart-legend">
                {sanitized.map((item, index) => (
                    <span key={`${item.label}-legend`} className="dashboard-chart-legend-item">
                        <i className="dashboard-chart-legend-swatch" style={{ backgroundColor: resolveColor(index, item.color) }} />
                        {item.label}: {formatChartCount(item.value)}
                    </span>
                ))}
            </div>
        </div>
    );
}

export function FunnelChart({ data, ariaLabel, emptyMessage, formatter = formatChartCount }: FunnelChartProps) {
    const sanitized = data.filter((item) => Number.isFinite(item.value) && item.value > 0);
    if (sanitized.length === 0) return renderEmpty(emptyMessage);
    const maxValue = Math.max(...sanitized.map((item) => item.value), 1);

    return (
        <div className="dashboard-chart-funnel" role="img" aria-label={ariaLabel}>
            {sanitized.map((item, index) => (
                <div key={`${item.label}-${index}`} className="dashboard-chart-funnel-row">
                    <span className="dashboard-chart-funnel-label">{truncateChartLabel(item.label, 24)}</span>
                    <div className="dashboard-chart-funnel-track">
                        <div
                            className="dashboard-chart-funnel-fill"
                            style={{
                                width: `${(item.value / maxValue) * 100}%`,
                                background: `linear-gradient(90deg, ${resolveColor(index, item.color)}99 0%, ${resolveColor(index, item.color)} 100%)`
                            }}
                            title={`${item.label}: ${formatter(item.value)}`}
                        />
                    </div>
                    <span className="dashboard-chart-funnel-value">{formatter(item.value)}</span>
                </div>
            ))}
        </div>
    );
}

export function MatrixAvailabilityChart({ rows, columns, values, ariaLabel, emptyMessage }: MatrixAvailabilityChartProps) {
    if (rows.length === 0 || columns.length === 0 || values.length === 0) return renderEmpty(emptyMessage);

    return (
        <div className="dashboard-chart-matrix" role="img" aria-label={ariaLabel}>
            <div
                className="dashboard-chart-matrix-head"
                style={{ gridTemplateColumns: `minmax(120px, 150px) repeat(${columns.length}, minmax(0, 1fr))` }}
            >
                <span />
                {columns.map((column) => (
                    <span key={column} className="dashboard-chart-axis-label">{truncateChartLabel(column, 18)}</span>
                ))}
            </div>
            {rows.map((row) => (
                <div
                    key={row}
                    className="dashboard-chart-matrix-row"
                    style={{ gridTemplateColumns: `minmax(120px, 150px) repeat(${columns.length}, minmax(0, 1fr))` }}
                >
                    <span className="dashboard-chart-heatmap-label">{row}</span>
                    {columns.map((column) => {
                        const value = values.find((entry) => entry.row === row && entry.column === column);
                        return (
                            <div
                                key={`${row}-${column}`}
                                className="dashboard-chart-matrix-cell"
                                data-status={value?.status ?? 'unavailable'}
                                title={value?.label ?? 'No disponible'}
                            >
                                {value?.label ?? 'No disponible'}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
