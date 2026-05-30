import { useMemo, type CSSProperties, type ReactNode } from 'react';
import {
    Area,
    AreaChart as ReAreaChart,
    Bar,
    BarChart as ReBarChart,
    CartesianGrid,
    Cell,
    Legend,
    LabelList,
    Line,
    LineChart as ReLineChart,
    Pie,
    PieChart as RePieChart,
    ResponsiveContainer,
    Tooltip,
    Treemap,
    XAxis,
    YAxis
} from 'recharts';
import { getAlertLevelMeta } from '../../utils/dashboard/alerts';
import './DashboardCharts.css';

export interface DashboardChartItem {
    id?: string;
    label?: string;
    name?: string;
    key?: string;
    domain?: string;
    alert_level?: string;
    date?: string;
    month?: string;
    value?: number;
    total?: number;
    count?: number;
    sessions?: number;
    size?: number;
    tone?: string;
    color?: string;
    meta?: string;
    [key: string]: unknown;
}

interface DashboardChartCardProps {
    title: string;
    description?: string;
    data: DashboardChartItem[];
    loading?: boolean;
    emptyText?: string;
    variant?: 'bars' | 'line' | 'area' | 'donut';
    formatter?: (value: number) => string;
    className?: string;
}

interface DashboardSectionProps {
    title?: ReactNode;
    subtitle?: ReactNode;
    description?: ReactNode;
    note?: ReactNode;
    className?: string;
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
    className?: string;
    [key: string]: unknown;
}

interface CompatChartProps {
    data?: Array<Record<string, unknown>>;
    items?: Array<Record<string, unknown>>;
    rows?: string[];
    columns?: string[];
    cells?: Array<Record<string, unknown>>;
    values?: Array<Record<string, unknown>>;
    ariaLabel?: string;
    formatter?: (value: number) => string;
    xLabelFormatter?: (value: string) => string;
    xTooltipFormatter?: (value: string) => string;
    maxValue?: number;
    minValue?: number;
    minY?: number;
    maxY?: number;
    emptyMessage?: string;
    series?: Array<Record<string, unknown>>;
    helper?: ReactNode;
    type?: 'area' | 'donut' | 'heatmap' | 'line' | 'treemap' | 'bar' | 'histogram' | 'matrix' | 'delta';
    [key: string]: unknown;
}

type NormalizedChartItem = {
    id: string;
    label: string;
    value: number;
    tone?: string;
    color?: string;
    meta?: string;
    raw: Record<string, unknown>;
};

const CATEGORY_COLORS = ['#0f5f9f', '#2f8f6b', '#e67e22', '#c0392b', '#7c3aed', '#235ea8', '#bd1f2d', '#64748b'];

const HUMAN_LABELS: Record<string, string> = {
    adhd: 'TDAH',
    anxiety: 'Ansiedad',
    depression: 'Depresión',
    conduct: 'Conducta',
    elimination: 'Eliminación',
    inattention: 'Inatención',
    hyperactivity: 'Hiperactividad',
    impulsivity: 'Impulsividad',
    sadness: 'Estado de ánimo bajo',
    irritability: 'Irritabilidad',
    aggression: 'Conducta agresiva',
    low: 'Baja',
    moderate: 'Moderada',
    elevated: 'Elevada',
    high: 'Alta',
    critical_review: 'Revisión prioritaria',
    draft: 'Borrador',
    in_progress: 'En progreso',
    submitted: 'Enviado',
    processed: 'Procesado',
    failed: 'Fallido',
    archived: 'Archivado',
    pending: 'Pendiente',
    reviewed: 'Revisado',
    closed: 'Cerrado',
    orientation_recommended: 'Orientación recomendada',
    in_review: 'En revisión',
    accepted: 'Aceptada',
    rejected: 'Rechazada'
};

function toNumber(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function cleanLabel(value: unknown, fallback: string) {
    const label = typeof value === 'string' ? value.trim() : '';
    return label || fallback;
}

function looksLikeTechnicalId(value: string) {
    const compact = value.replace(/[-_]/g, '');
    return compact.length >= 16 && /^[a-f0-9]+$/i.test(compact);
}

function humanizeLabel(value: unknown, fallback = 'Sin etiqueta') {
    const raw = cleanLabel(value, '');
    if (!raw || looksLikeTechnicalId(raw)) return fallback;
    const normalized = raw.trim().toLowerCase();
    if (HUMAN_LABELS[normalized]) return HUMAN_LABELS[normalized];

    const alertMeta = getAlertLevelMeta(normalized);
    if (alertMeta.tone !== 'unknown') return alertMeta.label;

    const parsedDate = Date.parse(raw);
    if (/^\d{4}-\d{2}(-\d{2})?/.test(raw) && Number.isFinite(parsedDate)) {
        return new Intl.DateTimeFormat('es-CO', { month: 'short', year: '2-digit' }).format(new Date(parsedDate)).replace('.', '');
    }

    if (/^[a-z]+(_[a-z]+)+$/i.test(raw)) {
        return raw
            .split('_')
            .map((part) => HUMAN_LABELS[part.toLowerCase()] ?? `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
            .join(' ');
    }

    return raw;
}

function formatCompact(value: number) {
    return new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function compactChartLabel(label: string, maxLength = 24) {
    const normalized = label.trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, Math.max(8, maxLength - 1)).trim()}…`;
}

function limitRankedItems(data: NormalizedChartItem[], limit = 6) {
    const useful = data
        .filter((item) => Number.isFinite(item.value) && item.value !== 0)
        .sort((left, right) => Math.abs(right.value) - Math.abs(left.value));
    const top = useful.slice(0, limit);
    const rest = useful.slice(limit);
    if (rest.length === 0) return top;
    return [
        ...top,
        {
            id: 'chart-rest',
            label: 'Otros casos',
            value: rest.reduce((total, item) => total + item.value, 0),
            meta: `${rest.length} casos adicionales`,
            raw: {}
        }
    ];
}

function defaultFormatter(value: number) {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(value);
}

function resolveColor(item: NormalizedChartItem, index: number) {
    if (item.color) return item.color;
    const tone = getAlertLevelMeta(item.tone ?? (item.raw.alert_level as string | null | undefined));
    if (tone.tone !== 'unknown') return tone.color;
    return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

function firstPresent(...values: unknown[]) {
    return values.find((value) => value !== undefined && value !== null && value !== '');
}

function toChartItems(input?: Array<Record<string, unknown>>): NormalizedChartItem[] {
    return (input ?? [])
        .map((item, index) => {
            const label = humanizeLabel(
                firstPresent(item.label, item.name, item.key, item.domain, item.alert_level, item.date, item.month),
                'Sin etiqueta'
            );
            return {
                id: String(firstPresent(item.id, item.key, item.name, item.label, `chart-${index}`)),
                label,
                value: toNumber(firstPresent(item.value, item.total, item.count, item.sessions, item.size)),
                tone: typeof item.tone === 'string' ? item.tone : typeof item.alert_level === 'string' ? item.alert_level : undefined,
                color: typeof item.color === 'string' ? item.color : undefined,
                meta: typeof item.meta === 'string' ? item.meta : undefined,
                raw: item
            };
        })
        .filter((item) => Number.isFinite(item.value) && item.value !== 0);
}

function isSeriesPoint(value: Record<string, unknown>) {
    return value.values && typeof value.values === 'object' && !Array.isArray(value.values);
}

function normalizeSeriesData(data: Array<Record<string, unknown>> | undefined) {
    const source = data ?? [];
    if (source.some(isSeriesPoint)) {
        return source.map((item, index) => {
            const values = item.values as Record<string, unknown> | undefined;
            return {
                label: humanizeLabel(firstPresent(item.label, item.date, item.month), `Periodo ${index + 1}`),
                meta: typeof item.meta === 'string' ? item.meta : undefined,
                ...Object.fromEntries(Object.entries(values ?? {}).map(([key, value]) => [key, toNumber(value)]))
            };
        });
    }

    return toChartItems(source).map((item) => ({
        label: item.label,
        value: item.value,
        meta: item.meta
    }));
}

function hasLineValues(data: Array<Record<string, unknown>>, series: Array<{ key: string }>) {
    if (data.length === 0) return false;
    if (!series.length) return data.some((item) => toNumber(item.value) !== 0);
    return data.some((item) => series.some((serie) => serie.key.length > 0 && toNumber(item[serie.key]) !== 0));
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

function DashboardTooltip({ active, payload, label, formatter }: Readonly<{ active?: boolean; payload?: Array<{ value?: unknown; name?: string; color?: string; payload?: { fullLabel?: string; meta?: string } }>; label?: string; formatter?: (value: number) => string }>) {
    if (!active || !payload?.length) return null;
    const fullLabel = payload[0]?.payload?.fullLabel ?? label;
    const meta = payload[0]?.payload?.meta;
    return (
        <div className="dashboard-chart-tooltip">
            <strong>{fullLabel}</strong>
            {meta ? <small>{meta}</small> : null}
            {payload.map((item) => (
                <span key={`${item.name}-${String(item.value)}`}>
                    <i style={{ backgroundColor: item.color }} />
                    {item.name}: {formatter ? formatter(toNumber(item.value)) : defaultFormatter(toNumber(item.value))}
                </span>
            ))}
        </div>
    );
}

function EmptyOrSkeleton({ loading, emptyText }: Readonly<{ loading: boolean; emptyText: string }>) {
    if (loading) return <DashboardSkeleton />;
    return <DashboardEmptyState message={emptyText} />;
}

function SimpleAreaChart({ data, loading, emptyText, formatter }: Readonly<{ data: NormalizedChartItem[]; loading?: boolean; emptyText: string; formatter?: (value: number) => string }>) {
    const chartData = data.map((item) => ({ label: item.label, value: item.value }));
    if (loading || chartData.length === 0) return <EmptyOrSkeleton loading={loading === true} emptyText={emptyText} />;
    return (
        <div className="dashboard-chart-canvas">
            <ResponsiveContainer width="100%" height="100%">
                <ReAreaChart data={chartData} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
                    <defs>
                        <linearGradient id="dashboardAreaFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0f5f9f" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#0f5f9f" stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e6eef6" />
                    <XAxis dataKey="label" tick={{ fill: '#5a6e82', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={14} />
                    <YAxis tick={{ fill: '#5a6e82', fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
                    <Tooltip content={<DashboardTooltip formatter={formatter} />} />
                    <Area type="monotone" dataKey="value" name="Total" stroke="#0f5f9f" fill="url(#dashboardAreaFill)" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                </ReAreaChart>
            </ResponsiveContainer>
        </div>
    );
}

function SimpleLineChart({
    data,
    source,
    series,
    loading,
    emptyText,
    formatter,
    xLabelFormatter,
    minY,
    maxY
}: Readonly<{
    data: NormalizedChartItem[];
    source?: Array<Record<string, unknown>>;
    series?: Array<Record<string, unknown>>;
    loading?: boolean;
    emptyText: string;
    formatter?: (value: number) => string;
    xLabelFormatter?: (value: string) => string;
    minY?: number;
    maxY?: number;
}>) {
    const chartData = normalizeSeriesData(source ?? data.map((item) => item.raw));
    const lineSeries = series?.length
        ? series.map((item, index) => ({
            key: String(item.key ?? ''),
            label: humanizeLabel(item.label ?? item.key, `Serie ${index + 1}`),
            color: typeof item.color === 'string' ? item.color : CATEGORY_COLORS[index % CATEGORY_COLORS.length]
        })).filter((item) => item.key)
        : [{ key: 'value', label: 'Total', color: '#0f5f9f' }];

    if (loading || !hasLineValues(chartData, lineSeries)) return <EmptyOrSkeleton loading={loading === true} emptyText={emptyText} />;

    return (
        <div className="dashboard-chart-canvas dashboard-chart-canvas--large">
            <ResponsiveContainer width="100%" height="100%">
                <ReLineChart data={chartData} margin={{ top: 10, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e6eef6" />
                    <XAxis
                        dataKey="label"
                        tick={{ fill: '#5a6e82', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => xLabelFormatter ? xLabelFormatter(String(value)) : String(value)}
                        minTickGap={16}
                    />
                    <YAxis domain={[minY ?? 'auto', maxY ?? 'auto']} tick={{ fill: '#5a6e82', fontSize: 11 }} tickLine={false} axisLine={false} width={38} />
                    <Tooltip content={<DashboardTooltip formatter={formatter} />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {lineSeries.map((item) => (
                        <Line
                            key={item.key}
                            type="monotone"
                            dataKey={item.key}
                            name={item.label}
                            stroke={item.color}
                            strokeWidth={3}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                            connectNulls
                            isAnimationActive={false}
                        />
                    ))}
                </ReLineChart>
            </ResponsiveContainer>
        </div>
    );
}

function SimpleBarChart({ data, loading, emptyText, formatter, maxValue }: Readonly<{ data: NormalizedChartItem[]; loading?: boolean; emptyText: string; formatter?: (value: number) => string; maxValue?: number }>) {
    const limitedItems = limitRankedItems(data, 5);
    const chartData = limitedItems.map((item, index) => ({
        label: compactChartLabel(item.label, 20),
        fullLabel: item.label,
        meta: item.meta,
        value: item.value,
        color: resolveColor(item, index)
    }));

    if (loading || chartData.length === 0) return <EmptyOrSkeleton loading={loading === true} emptyText={emptyText} />;

    return (
        <div className="dashboard-chart-canvas dashboard-chart-canvas--large" style={{ minHeight: Math.max(250, chartData.length * 44 + 72) }}>
            <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={chartData} layout="vertical" margin={{ top: 8, right: 46, bottom: 4, left: 18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e6eef6" horizontal={false} />
                    <XAxis type="number" domain={[0, maxValue ?? 'auto']} tick={{ fill: '#5a6e82', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="label" tick={{ fill: '#1f4d75', fontSize: 12 }} tickLine={false} axisLine={false} width={188} interval={0} />
                    <Tooltip content={<DashboardTooltip formatter={formatter} />} />
                    <Bar dataKey="value" name="Total" radius={[0, 10, 10, 0]} barSize={22} isAnimationActive={false}>
                        <LabelList dataKey="value" position="right" formatter={(value: unknown) => formatter ? formatter(toNumber(value)) : defaultFormatter(toNumber(value))} className="dashboard-chart-value-label" />
                        {chartData.map((entry, index) => <Cell key={`${entry.label}-${index}`} fill={entry.color} />)}
                    </Bar>
                </ReBarChart>
            </ResponsiveContainer>
        </div>
    );
}

function SimpleDonutChart({ data, loading, emptyText, formatter }: Readonly<{ data: NormalizedChartItem[]; loading?: boolean; emptyText: string; formatter?: (value: number) => string }>) {
    const chartData = data.slice(0, 8).map((item, index) => ({
        name: item.label,
        value: item.value,
        color: resolveColor(item, index)
    }));
    const total = chartData.reduce((accumulator, item) => accumulator + item.value, 0);

    if (loading || chartData.length === 0 || total === 0) return <EmptyOrSkeleton loading={loading === true} emptyText={emptyText} />;

    return (
        <div className="dashboard-chart-donut-layout">
            <div className="dashboard-chart-donut">
                <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                        <Tooltip content={<DashboardTooltip formatter={formatter} />} />
                        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="86%" paddingAngle={2} isAnimationActive={false}>
                            {chartData.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={entry.color} />)}
                        </Pie>
                    </RePieChart>
                </ResponsiveContainer>
                <div className="dashboard-chart-donut-total">
                    <strong>{formatCompact(total)}</strong>
                    <span>Total</span>
                </div>
            </div>
            <div className="dashboard-chart-legend">
                {chartData.map((item, index) => (
                    <span key={`${item.name}-${index}`}>
                        <i style={{ backgroundColor: item.color }} />
                        {item.name} <strong>{formatter ? formatter(item.value) : defaultFormatter(item.value)}</strong>
                    </span>
                ))}
            </div>
        </div>
    );
}

function SimpleTreemapChart({ data, loading, emptyText }: Readonly<{ data: NormalizedChartItem[]; loading?: boolean; emptyText: string }>) {
    const chartData = data.slice(0, 12).map((item, index) => ({
        name: item.label,
        size: item.value,
        fill: resolveColor(item, index)
    }));

    if (loading || chartData.length === 0) return <EmptyOrSkeleton loading={loading === true} emptyText={emptyText} />;

    return (
        <div className="dashboard-chart-canvas dashboard-chart-canvas--large">
            <ResponsiveContainer width="100%" height="100%">
                <Treemap data={chartData} dataKey="size" nameKey="name" stroke="#ffffff" fill="#0f5f9f" isAnimationActive={false} />
            </ResponsiveContainer>
        </div>
    );
}

function Heatmap({ rows, columns, cells, loading, emptyText }: Readonly<{ rows?: string[]; columns?: string[]; cells?: Array<Record<string, unknown>>; loading?: boolean; emptyText: string }>) {
    const safeRows = (rows ?? []).map((row) => humanizeLabel(row));
    const safeColumns = (columns ?? []).map((column) => humanizeLabel(column));
    const safeCells = cells ?? [];
    const max = safeCells.reduce((accumulator, item) => Math.max(accumulator, toNumber(item.value)), 0);

    if (loading || safeRows.length === 0 || safeColumns.length === 0 || safeCells.length === 0 || max === 0) {
        return <EmptyOrSkeleton loading={loading === true} emptyText={emptyText} />;
    }

    return (
        <div className="dashboard-chart-heatmap" style={{ '--dashboard-heatmap-columns': safeColumns.length } as CSSProperties}>
            <div className="dashboard-chart-heatmap-head" />
            {safeColumns.map((column) => <div key={column} className="dashboard-chart-heatmap-label">{column}</div>)}
            {safeRows.map((row) => (
                <div key={row} className="dashboard-chart-heatmap-row">
                    <div className="dashboard-chart-heatmap-label is-row">{row}</div>
                    {safeColumns.map((column) => {
                        const cell = safeCells.find((item) => humanizeLabel(item.row) === row && humanizeLabel(item.column) === column);
                        const value = toNumber(cell?.value);
                        const opacity = max > 0 ? 0.18 + (value / max) * 0.72 : 0.1;
                        return (
                            <div
                                key={`${row}-${column}`}
                                className="dashboard-chart-heatmap-cell"
                                title={`${row} / ${column}: ${value}`}
                                style={{ backgroundColor: `rgba(15, 95, 159, ${opacity})` }}
                            >
                                {value > 0 ? value : ''}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

function AvailabilityMatrix({ rows, columns, values, loading, emptyText }: Readonly<{ rows?: string[]; columns?: string[]; values?: Array<Record<string, unknown>>; loading?: boolean; emptyText: string }>) {
    const safeRows = (rows ?? []).map((row) => humanizeLabel(row, row));
    const safeColumns = (columns ?? []).map((column) => humanizeLabel(column, column));
    const safeValues = values ?? [];
    if (loading || safeRows.length === 0 || safeColumns.length === 0 || safeValues.length === 0) {
        return <EmptyOrSkeleton loading={loading === true} emptyText={emptyText} />;
    }

    return (
        <div className="dashboard-chart-matrix" style={{ '--dashboard-matrix-columns': safeColumns.length } as CSSProperties}>
            <div className="dashboard-chart-matrix-head" />
            {safeColumns.map((column) => <div key={column} className="dashboard-chart-matrix-label">{column}</div>)}
            {safeRows.map((row) => (
                <div key={row} className="dashboard-chart-matrix-row">
                    <div className="dashboard-chart-matrix-label is-row">{row}</div>
                    {safeColumns.map((column) => {
                        const value = safeValues.find((item) => humanizeLabel(item.row, String(item.row ?? '')) === row && humanizeLabel(item.column, String(item.column ?? '')) === column);
                        const status = cleanLabel(value?.status, 'partial');
                        const label = humanizeLabel(value?.label, '--');
                        return (
                            <div key={`${row}-${column}`} className={`dashboard-chart-matrix-cell is-${status}`}>
                                {label}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

function Timeline({ items, loading, emptyText }: Readonly<{ items?: Array<Record<string, unknown>>; loading?: boolean; emptyText: string }>) {
    const safeItems = (items ?? []).slice(0, 8);
    if (loading || safeItems.length === 0) return <EmptyOrSkeleton loading={loading === true} emptyText={emptyText} />;
    return (
        <ol className="dashboard-chart-timeline">
            {safeItems.map((item, index) => (
                <li key={String(item.date ?? item.title ?? index)}>
                    <span />
                    <div>
                        <strong>{cleanLabel(item.title, `Evento ${index + 1}`)}</strong>
                        <p>{cleanLabel(item.description, cleanLabel(item.date, 'Sin fecha visible'))}</p>
                    </div>
                </li>
            ))}
        </ol>
    );
}

function DivergingBars({ data, loading, emptyText, formatter }: Readonly<{ data: NormalizedChartItem[]; loading?: boolean; emptyText: string; formatter?: (value: number) => string }>) {
    const chartData = data.filter((item) => item.value !== 0).slice(0, 10).map((item) => ({
        label: item.label,
        value: item.value,
        color: item.value >= 0 ? '#bf6d1e' : '#2f8f6b'
    }));
    if (loading || chartData.length === 0) return <EmptyOrSkeleton loading={loading === true} emptyText={emptyText} />;
    return (
        <div className="dashboard-chart-canvas dashboard-chart-canvas--large">
            <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={chartData} layout="vertical" margin={{ top: 8, right: 42, bottom: 4, left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e6eef6" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#5a6e82', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="label" tick={{ fill: '#1f4d75', fontSize: 12 }} tickLine={false} axisLine={false} width={154} interval={0} />
                    <Tooltip content={<DashboardTooltip formatter={formatter} />} />
                    <Bar dataKey="value" name="Cambio" radius={[0, 10, 10, 0]} barSize={22} isAnimationActive={false}>
                        <LabelList dataKey="value" position="right" formatter={(value: unknown) => formatter ? formatter(toNumber(value)) : defaultFormatter(toNumber(value))} className="dashboard-chart-value-label" />
                        {chartData.map((entry, index) => <Cell key={`${entry.label}-${index}`} fill={entry.color} />)}
                    </Bar>
                </ReBarChart>
            </ResponsiveContainer>
        </div>
    );
}

function CompatChart({
    data,
    items,
    ariaLabel,
    formatter,
    emptyMessage,
    series,
    rows,
    columns,
    cells,
    values,
    maxValue,
    minY,
    maxY,
    xLabelFormatter,
    helper,
    type
}: Readonly<CompatChartProps>) {
    const normalizedData = useMemo(() => toChartItems(data ?? items), [data, items]);
    const title = ariaLabel ?? 'Gráfica';
    const emptyText = emptyMessage ?? 'Aún no hay datos procesados suficientes para esta visualización.';

    if (type === 'heatmap') {
        return <Heatmap rows={rows} columns={columns} cells={cells} emptyText={emptyText} />;
    }
    if (type === 'matrix') {
        return <AvailabilityMatrix rows={rows} columns={columns} values={values} emptyText={emptyText} />;
    }

    return (
        <div className="dashboard-chart-standalone" aria-label={title}>
            {type === 'donut' ? <SimpleDonutChart data={normalizedData} emptyText={emptyText} formatter={formatter} /> : null}
            {type === 'area' ? <SimpleAreaChart data={normalizedData} emptyText={emptyText} formatter={formatter} /> : null}
            {type === 'line' ? <SimpleLineChart data={normalizedData} source={data} series={series} emptyText={emptyText} formatter={formatter} xLabelFormatter={xLabelFormatter} minY={typeof minY === 'number' ? minY : undefined} maxY={typeof maxY === 'number' ? maxY : undefined} /> : null}
            {type === 'treemap' ? <SimpleTreemapChart data={normalizedData} emptyText={emptyText} /> : null}
            {type === 'delta' ? <DivergingBars data={normalizedData} emptyText={emptyText} formatter={formatter} /> : null}
            {(!type || type === 'bar' || type === 'histogram') ? <SimpleBarChart data={normalizedData} emptyText={emptyText} formatter={formatter} maxValue={maxValue} /> : null}
            {helper ? <p className="dashboard-chart-helper">{helper}</p> : null}
        </div>
    );
}

export function DashboardSection({ title, subtitle, description, note, children, className }: Readonly<DashboardSectionProps>) {
    return (
        <section className={`dashboard-chart-section ${className ?? ''}`.trim()}>
            {(title || subtitle || description || note) ? (
                <header>
                    {title ? <h3>{title}</h3> : null}
                    {subtitle ?? description ? <p>{subtitle ?? description}</p> : null}
                    {note ? <small>{note}</small> : null}
                </header>
            ) : null}
            {children}
        </section>
    );
}

export function DashboardEmptyState({ message = 'No hay datos disponibles.' }: Readonly<DashboardEmptyStateProps>) {
    const normalizedMessage = /No hay datos suficientes/i.test(message)
        ? 'No encontramos datos útiles con estos filtros. Amplía el periodo o limpia filtros para recuperar la lectura.'
        : message;
    return <p className="dashboard-chart-empty">{normalizedMessage}</p>;
}

export function DashboardMetricCard({ label, title, value, helper, tone, className }: Readonly<DashboardMetricCardProps>) {
    return (
        <article className={`dashboard-metric-card ${tone ? `is-${tone}` : ''} ${className ?? ''}`.trim()}>
            <span>{label ?? title ?? 'Métrica'}</span>
            <strong>{value ?? '--'}</strong>
            {helper ? <small>{helper}</small> : null}
        </article>
    );
}

export function AreaChart(props: Readonly<CompatChartProps>) {
    return <CompatChart {...props} type="area" />;
}

export function DonutChart(props: Readonly<CompatChartProps>) {
    return <CompatChart {...props} type="donut" />;
}

export function HeatmapChart(props: Readonly<CompatChartProps>) {
    return <CompatChart {...props} type="heatmap" />;
}

export function TimelineChart(props: Readonly<CompatChartProps>) {
    return <Timeline items={props.items ?? props.data} emptyText={props.emptyMessage ?? 'No hay eventos suficientes para mostrar esta línea temporal.'} />;
}

export function LineChart(props: Readonly<CompatChartProps>) {
    return <CompatChart {...props} type="line" />;
}

export function TreemapChart(props: Readonly<CompatChartProps>) {
    return <CompatChart {...props} type="treemap" />;
}

export function HorizontalBarChart(props: Readonly<CompatChartProps>) {
    return <CompatChart {...props} type="bar" />;
}

export function WaffleChart(props: Readonly<CompatChartProps>) {
    return <CompatChart {...props} type="donut" />;
}

export function HistogramChart(props: Readonly<CompatChartProps>) {
    return <CompatChart {...props} type="histogram" />;
}

export function MatrixAvailabilityChart(props: Readonly<CompatChartProps>) {
    return <CompatChart {...props} type="matrix" />;
}

export function DivergingDeltaChart(props: Readonly<CompatChartProps>) {
    return <CompatChart {...props} type="delta" />;
}

export function DashboardChartCard({
    title,
    description,
    data,
    loading = false,
    emptyText = 'Aún no hay datos procesados suficientes para esta visualización.',
    variant = 'bars',
    formatter,
    className
}: Readonly<DashboardChartCardProps>) {
    const normalizedData = toChartItems(data);
    return (
        <article className={`dashboard-chart-section ${className ?? ''}`.trim()} aria-label={title}>
            <header>
                <h3>{title}</h3>
                {description ? <p>{description}</p> : null}
            </header>
            {variant === 'line' ? (
                <SimpleLineChart data={normalizedData} source={data} loading={loading} emptyText={emptyText} formatter={formatter} />
            ) : variant === 'area' ? (
                <SimpleAreaChart data={normalizedData} loading={loading} emptyText={emptyText} formatter={formatter} />
            ) : variant === 'donut' ? (
                <SimpleDonutChart data={normalizedData} loading={loading} emptyText={emptyText} formatter={formatter} />
            ) : (
                <SimpleBarChart data={normalizedData} loading={loading} emptyText={emptyText} formatter={formatter} />
            )}
        </article>
    );
}
