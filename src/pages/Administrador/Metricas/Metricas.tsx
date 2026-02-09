import { useMemo, useState } from 'react';
import metricsFixture from './metricas.json';
import './Metricas.css';

type StatusCounts = Record<'200' | '401' | '500', number>;

interface MetricsData {
    server_status: 'ok' | 'degraded' | 'down';
    database: {
        status: 'ready' | 'down' | 'degraded';
        latency_ms: number;
    };
    snapshot_metrics: {
        latency_ms_avg: number;
        latency_ms_max: number;
        requests_total: number;
        uptime_seconds: number;
        status_counts: StatusCounts;
    };
}

function formatUptime(seconds: number) {
    if (seconds < 60) return `${seconds} s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function buildSparkline(base: number, variance: number, points = 12) {
    const values = Array.from({ length: points }, (_, index) => {
        const seed = Math.sin((index + 1) * 1.7) * variance;
        return Math.max(0, base + seed);
    });
    return values;
}

function buildSparklinePath(values: number[], width: number, height: number) {
    const max = Math.max(...values, 1);
    const step = width / (values.length - 1);
    return values
        .map((value, index) => {
            const x = index * step;
            const y = height - (value / max) * height;
            return `${index === 0 ? 'M' : 'L'}${x},${y}`;
        })
        .join(' ');
}

function StatusDonut({ counts }: { counts: StatusCounts }) {
    const total = counts['200'] + counts['401'] + counts['500'];
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const segments = [
        { key: '200', color: '#1f9d55', value: counts['200'] },
        { key: '401', color: '#f0ad4e', value: counts['401'] },
        { key: '500', color: '#dc3545', value: counts['500'] }
    ];
    let offset = 0;

    return (
        <svg className="metricas-donut" viewBox="0 0 80 80" role="img" aria-label="Conteo de estados HTTP">
            {segments.map((segment) => {
                const dash = (segment.value / total) * circumference;
                const strokeDasharray = `${dash} ${circumference - dash}`;
                const strokeDashoffset = -offset;
                offset += dash;
                return (
                    <circle
                        key={segment.key}
                        className="donut-ring"
                        cx="40"
                        cy="40"
                        r={radius}
                        fill="none"
                        stroke={segment.color}
                        strokeWidth="10"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                    />
                );
            })}
            <circle cx="40" cy="40" r="20" fill="#ffffff" />
        </svg>
    );
}

export default function Metricas() {
    const [metrics, setMetrics] = useState<MetricsData>(metricsFixture as MetricsData);
    const [updating, setUpdating] = useState(false);

    const statusCounts = metrics.snapshot_metrics.status_counts;
    const totalStatus = statusCounts['200'] + statusCounts['401'] + statusCounts['500'];

    const uptimeLabel = formatUptime(metrics.snapshot_metrics.uptime_seconds);
    const latencyBarPercent = Math.min(metrics.database.latency_ms / 200, 1) * 100;

    const requestSparkline = useMemo(
        () => buildSparkline(metrics.snapshot_metrics.requests_total, 12),
        [metrics.snapshot_metrics.requests_total]
    );
    const latencySparkline = useMemo(
        () => buildSparkline(metrics.snapshot_metrics.latency_ms_avg, 6),
        [metrics.snapshot_metrics.latency_ms_avg]
    );

    const handleRefresh = () => {
        if (updating) return;
        setUpdating(true);
        window.setTimeout(() => {
            setMetrics((current) => {
                const jitter = () => Math.max(0, Math.round((Math.random() - 0.45) * 6));
                const latencyAvg = Math.max(6, current.snapshot_metrics.latency_ms_avg + jitter());
                const latencyMax = Math.max(latencyAvg + 20, current.snapshot_metrics.latency_ms_max + jitter() * 2);
                const requestsTotal = current.snapshot_metrics.requests_total + Math.max(1, jitter() + 2);
                const latencyDb = Math.max(12, current.database.latency_ms + jitter());
                return {
                    ...current,
                    database: {
                        ...current.database,
                        latency_ms: latencyDb
                    },
                    snapshot_metrics: {
                        ...current.snapshot_metrics,
                        latency_ms_avg: latencyAvg,
                        latency_ms_max: latencyMax,
                        requests_total: requestsTotal,
                        uptime_seconds: current.snapshot_metrics.uptime_seconds + 60
                    }
                };
            });
            setUpdating(false);
        }, 600);
    };

    return (
        <div className="metricas">
            <header className="metricas-header">
                <div>
                    <h1>Métricas del sistema</h1>
                    <p>Visión general del estado del servidor, base de datos y métricas de tráfico.</p>
                </div>
                <button
                    type="button"
                    className="metricas-refresh"
                    onClick={handleRefresh}
                    disabled={updating}
                    aria-label="Actualizar métricas"
                >
                    {updating ? 'Actualizando...' : 'Actualizar'}
                </button>
            </header>
            <div className="metricas-divider" aria-hidden="true" />

            <section className="metricas-row">
                <div className="metricas-block accent-green">
                    <div className="metricas-block-title">Servidor</div>
                    <div className="metricas-status">
                        <span className="status-dot status-ok" aria-hidden="true" />
                        <span className="status-label">OK</span>
                    </div>
                    <div className="metricas-small">Servidor operativo</div>
                    <div className="metricas-micro">Sin interrupciones registradas</div>
                </div>

                <div className="metricas-block accent-blue">
                    <div className="metricas-block-title">Base de datos — Lista</div>
                    <div className="metricas-small">Latencia: {metrics.database.latency_ms} ms</div>
                    <div className="metricas-latency">
                        <span className="metricas-latency-icon" aria-hidden="true">⏱</span>
                        <div className="metricas-latency-bar">
                            <span style={{ width: `${latencyBarPercent}%` }} />
                        </div>
                    </div>
                </div>

                <div className="metricas-block accent-slate">
                    <div className="metricas-block-title">Uptime</div>
                    <div className="metricas-value">{uptimeLabel}</div>
                    <div className="metricas-small">Solicitudes totales</div>
                    <div className="metricas-value">{metrics.snapshot_metrics.requests_total}</div>
                </div>
            </section>

            <section className="metricas-snapshot">
                <div className="metricas-snapshot-main">
                    <h2>Snapshot de métricas</h2>
                    <div className="metricas-grid">
                        <div>
                            <span className="metricas-label">Latencia promedio</span>
                            <div className="metricas-value">{metrics.snapshot_metrics.latency_ms_avg} ms</div>
                            <svg className="metricas-sparkline" viewBox="0 0 120 40" role="img" aria-label="Tendencia de latencia">
                                <path
                                    className="sparkline-path"
                                    d={buildSparklinePath(latencySparkline, 120, 40)}
                                    fill="none"
                                />
                            </svg>
                        </div>
                        <div>
                            <span className="metricas-label">Latencia máxima</span>
                            <div className="metricas-value">{metrics.snapshot_metrics.latency_ms_max} ms</div>
                        </div>
                        <div>
                            <span className="metricas-label">Solicitudes totales</span>
                            <div className="metricas-value">{metrics.snapshot_metrics.requests_total}</div>
                            <svg className="metricas-sparkline" viewBox="0 0 120 40" role="img" aria-label="Tendencia de solicitudes">
                                <path
                                    className="sparkline-path"
                                    d={buildSparklinePath(requestSparkline, 120, 40)}
                                    fill="none"
                                />
                            </svg>
                        </div>
                        <div>
                            <span className="metricas-label">Uptime</span>
                            <div className="metricas-value">{uptimeLabel}</div>
                        </div>
                    </div>
                </div>

                <div className="metricas-snapshot-side">
                    <StatusDonut counts={statusCounts} />
                    <div className="metricas-legend">
                        <div>
                            <span className="legend-dot legend-green" aria-hidden="true" />
                            200 — {statusCounts['200']} ({Math.round((statusCounts['200'] / totalStatus) * 100)}%)
                        </div>
                        <div>
                            <span className="legend-dot legend-yellow" aria-hidden="true" />
                            401 — {statusCounts['401']} ({Math.round((statusCounts['401'] / totalStatus) * 100)}%)
                        </div>
                        <div>
                            <span className="legend-dot legend-red" aria-hidden="true" />
                            500 — {statusCounts['500']} ({Math.round((statusCounts['500'] / totalStatus) * 100)}%)
                        </div>
                    </div>
                    <p className="metricas-note">
                        La latencia promedio se mantiene en {metrics.snapshot_metrics.latency_ms_avg} ms, con máximo de {metrics.snapshot_metrics.latency_ms_max} ms en picos.
                    </p>
                </div>
            </section>

            <section className="metricas-table" aria-label="Detalle de métricas">
                <div className="metricas-table-row header">
                    <span>Indicador</span>
                    <span>Métrica</span>
                    <span>Valor</span>
                    <span>Comentario</span>
                </div>
                <div className="metricas-table-row">
                    <span className="indicator green" aria-hidden="true" />
                    <span>Uptime</span>
                    <span>{uptimeLabel}</span>
                    <span>Tiempo activo continuo del servicio.</span>
                </div>
                <div className="metricas-table-row">
                    <span className="indicator blue" aria-hidden="true" />
                    <span>Solicitudes totales</span>
                    <span>{metrics.snapshot_metrics.requests_total}</span>
                    <span>Tráfico acumulado desde el arranque.</span>
                </div>
                <div className="metricas-table-row">
                    <span className="indicator teal" aria-hidden="true" />
                    <span>Latencia promedio</span>
                    <span>{metrics.snapshot_metrics.latency_ms_avg} ms</span>
                    <span>Tiempo medio de respuesta.</span>
                </div>
                <div className="metricas-table-row">
                    <span className="indicator orange" aria-hidden="true" />
                    <span>Latencia máxima</span>
                    <span>{metrics.snapshot_metrics.latency_ms_max} ms</span>
                    <span>Picos de carga recientes.</span>
                </div>
                <div className="metricas-table-row">
                    <span className="indicator green" aria-hidden="true" />
                    <span>HTTP 200</span>
                    <span>{statusCounts['200']}</span>
                    <span>Respuestas exitosas.</span>
                </div>
                <div className="metricas-table-row">
                    <span className="indicator yellow" aria-hidden="true" />
                    <span>HTTP 401</span>
                    <span>{statusCounts['401']}</span>
                    <span>Accesos no autorizados.</span>
                </div>
                <div className="metricas-table-row">
                    <span className="indicator red" aria-hidden="true" />
                    <span>HTTP 500</span>
                    <span>{statusCounts['500']}</span>
                    <span>Errores internos.</span>
                </div>
            </section>
        </div>
    );
}
