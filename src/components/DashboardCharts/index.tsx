import { useMemo } from 'react';
import { getAlertLevelMeta } from '../../utils/dashboard/alerts';
import './DashboardCharts.css';

export interface DashboardChartItem {
    id: string;
    label: string;
    value: number;
    tone?: string;
}

interface DashboardChartCardProps {
    title: string;
    description?: string;
    data: DashboardChartItem[];
    loading?: boolean;
    emptyText?: string;
    variant?: 'bars' | 'line';
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
    const max = data.reduce((acc, item) => Math.max(acc, item.value), 0);

    return (
        <div className="dashboard-chart-bars" role="list">
            {data.map((item) => {
                const percentage = max > 0 ? Math.round((item.value / max) * 100) : 0;
                const toneMeta = getAlertLevelMeta(item.tone ?? null);
                return (
                    <div className="dashboard-chart-bar-row" key={item.id} role="listitem">
                        <div className="dashboard-chart-bar-label" title={item.label}>{item.label}</div>
                        <div className="dashboard-chart-bar-track">
                            <i
                                style={{
                                    width: `${percentage}%`,
                                    backgroundColor: toneMeta.color
                                }}
                                aria-hidden="true"
                            />
                        </div>
                        <div className="dashboard-chart-bar-value">{formatCompact(item.value)}</div>
                    </div>
                );
            })}
        </div>
    );
}

function LineChart({ data }: Readonly<{ data: DashboardChartItem[] }>) {
    const coordinates = useMemo(() => {
        if (data.length === 0) return '';
        const max = data.reduce((acc, item) => Math.max(acc, item.value), 0);
        return data
            .map((item, index) => {
                const x = (index / Math.max(data.length - 1, 1)) * 100;
                const y = max > 0 ? 100 - (item.value / max) * 100 : 100;
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
                    <span key={item.id} title={item.label}>{item.label}</span>
                ))}
            </div>
        </div>
    );
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
            {!loading && data.length > 0 && variant === 'line' ? <LineChart data={data} /> : null}
        </article>
    );
}
