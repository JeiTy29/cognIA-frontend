import { useMemo } from 'react';
import './Metricas.css';
import { useMetrics } from '../hooks/useMetrics';
import { useAuth } from '../../../hooks/auth/useAuth';

function formatUptime(seconds: number) {
    if (seconds < 60) return `${seconds} s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function buildSparklinePath(values: number[], width: number, height: number) {
    const max = Math.max(...values, 1);
    const step = values.length > 1 ? width / (values.length - 1) : width;
    return values
        .map((value, index) => {
            const x = index * step;
            const y = height - (value / max) * height;
            return `${index === 0 ? 'M' : 'L'}${x},${y}`;
        })
        .join(' ');
}

function StatusDonut({ counts }: { counts: Record<'200' | '401' | '500', number> }) {
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
                const dash = total > 0 ? (segment.value / total) * circumference : 0;
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
    const { accessToken, setSession } = useAuth();
    const {
        serverState,
        dbState,
        snapshot,
        metricsDisabled,
        errorMessage,
        isLoading,
        lastUpdated,
        requestHistory,
        latencyHistory,
        reload,
        isRefreshing
    } = useMetrics({
        accessToken,
        setSession
    });

    const statusCounts = snapshot?.status_counts ?? { '200': 0, '401': 0, '500': 0 };
    const totalStatus = statusCounts['200'] + statusCounts['401'] + statusCounts['500'];

    const uptimeLabel = snapshot ? formatUptime(snapshot.uptime_seconds) : '--';
    const latencyAvg = snapshot?.latency_ms_avg ?? null;
    const latencyMax = snapshot?.latency_ms_max ?? null;
    const requestsTotal = snapshot?.requests_total ?? null;

    const latencyBarPercent = useMemo(() => {
        const latency = dbState.latency_ms ?? 0;
        return Math.min(latency / 2000, 1) * 100;
    }, [dbState.latency_ms]);

    const latencyStatusClass = useMemo(() => {
        if (latencyMax === null) return '';
        if (latencyMax < 50) return 'status-ok';
        if (latencyMax < 1000) return 'status-warn';
        return 'status-error';
    }, [latencyMax]);

    const dbBadgeLabel = dbState.status === 'ready'
        ? 'Lista'
        : dbState.status === 'not_ready'
            ? 'No disponible'
            : dbState.status === 'error'
                ? 'No disponible'
                : 'Cargando';
    const dbStatusDot = dbState.status === 'ready'
        ? 'status-ok'
        : dbState.status === 'not_ready' || dbState.status === 'error'
            ? 'status-error'
            : 'status-warn';

    return (
        <div className="metricas">
            <header className="metricas-header">
                <div>
                    <h1>Métricas del sistema</h1>
                    <p>Visión general del estado del servidor, base de datos y métricas de tráfico.</p>
                    {lastUpdated && (
                        <span className="metricas-updated">Última actualización: {lastUpdated.toLocaleTimeString()}</span>
                    )}
                </div>
                <button
                    type="button"
                    className="metricas-refresh"
                    onClick={reload}
                    disabled={isRefreshing}
                    aria-label="Actualizar métricas"
                >
                    {isRefreshing ? 'Actualizando...' : 'Actualizar'}
                </button>
            </header>
            <div className="metricas-divider" aria-hidden="true" />

            <section className="metricas-row">
                <div className="metricas-block accent-green">
                    <div className="metricas-block-title">Estado del servidor</div>
                    <div className="metricas-status">
                        <span className={`status-dot ${serverState.status === 'ok' ? 'status-ok' : 'status-error'}`} aria-hidden="true" />
                        <span className="status-label">
                            {serverState.status === 'ok' ? 'OK' : serverState.status === 'loading' ? 'Cargando' : 'No disponible'}
                        </span>
                    </div>
                    <div className="metricas-small">
                        {serverState.status === 'ok' ? 'Servidor operativo' : 'No disponible — ver logs'}
                    </div>
                    <div className="metricas-micro">{serverState.detail || 'Sin interrupciones registradas'}</div>
                </div>

                <div className="metricas-block accent-blue">
                    <div className="metricas-block-title">Base de datos</div>
                    <div className="metricas-status">
                        <span className={`status-dot ${dbStatusDot}`} aria-hidden="true" />
                        <span className="status-label">{dbBadgeLabel}</span>
                    </div>
                    <div className="metricas-small">
                        Latencia: {dbState.latency_ms !== null ? `${dbState.latency_ms.toFixed(1)} ms` : '--'}
                    </div>
                    <div className="metricas-latency">
                        <span className="metricas-latency-icon" aria-hidden="true">⏱</span>
                        <div className="metricas-latency-bar">
                            <span style={{ width: `${latencyBarPercent}%` }} />
                        </div>
                    </div>
                    <div className="metricas-micro">
                        {dbState.status === 'ready' ? 'Base de datos lista' : 'Revisa la conectividad del servicio'}
                    </div>
                </div>

                <div className="metricas-block accent-slate">
                    <div className="metricas-block-title">Uptime</div>
                    <div className="metricas-value">{uptimeLabel}</div>
                    <div className="metricas-small">Solicitudes totales</div>
                    <div className="metricas-value">{requestsTotal ?? '--'}</div>
                </div>
            </section>

            {metricsDisabled ? (
                <section className="metricas-disabled">
                    <h2>Métricas deshabilitadas</h2>
                    <p>El sistema no está exponiendo métricas en este momento.</p>
                    <button type="button" className="metricas-refresh" onClick={reload}>Recargar</button>
                </section>
            ) : (
                <section className="metricas-snapshot">
                    <div className="metricas-snapshot-main">
                        <h2>Snapshot de métricas</h2>
                        <div className="metricas-grid">
                            <div>
                                <span className="metricas-label">Latencia promedio</span>
                                <div className="metricas-value">{latencyAvg !== null ? `${latencyAvg.toFixed(1)} ms` : '--'}</div>
                                {latencyHistory.length > 1 && (
                                    <svg className="metricas-sparkline" viewBox="0 0 120 40" role="img" aria-label="Tendencia de latencia">
                                        <path
                                            className="sparkline-path"
                                            d={buildSparklinePath(latencyHistory, 120, 40)}
                                            fill="none"
                                        />
                                    </svg>
                                )}
                            </div>
                            <div>
                                <span className="metricas-label">Latencia máxima</span>
                                <div className={`metricas-value ${latencyStatusClass}`}>{latencyMax !== null ? `${latencyMax.toFixed(1)} ms` : '--'}</div>
                            </div>
                            <div>
                                <span className="metricas-label">Solicitudes totales</span>
                                <div className="metricas-value">{requestsTotal ?? '--'}</div>
                                {requestHistory.length > 1 && (
                                    <svg className="metricas-sparkline" viewBox="0 0 120 40" role="img" aria-label="Tendencia de solicitudes">
                                        <path
                                            className="sparkline-path"
                                            d={buildSparklinePath(requestHistory, 120, 40)}
                                            fill="none"
                                        />
                                    </svg>
                                )}
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
                                200 — {statusCounts['200']} ({totalStatus ? Math.round((statusCounts['200'] / totalStatus) * 100) : 0}%)
                            </div>
                            <div>
                                <span className="legend-dot legend-yellow" aria-hidden="true" />
                                401 — {statusCounts['401']} ({totalStatus ? Math.round((statusCounts['401'] / totalStatus) * 100) : 0}%)
                            </div>
                            <div>
                                <span className="legend-dot legend-red" aria-hidden="true" />
                                500 — {statusCounts['500']} ({totalStatus ? Math.round((statusCounts['500'] / totalStatus) * 100) : 0}%)
                            </div>
                        </div>
                        <p className="metricas-note">
                            La latencia promedio se mantiene en {latencyAvg !== null ? latencyAvg.toFixed(1) : '--'} ms, con máximo de {latencyMax !== null ? latencyMax.toFixed(1) : '--'} ms en picos.
                        </p>
                    </div>
                </section>
            )}

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
                    <span>{requestsTotal ?? '--'}</span>
                    <span>Tráfico acumulado desde el arranque.</span>
                </div>
                <div className="metricas-table-row">
                    <span className="indicator teal" aria-hidden="true" />
                    <span>Latencia promedio</span>
                    <span>{latencyAvg !== null ? `${latencyAvg.toFixed(1)} ms` : '--'}</span>
                    <span>Tiempo medio de respuesta.</span>
                </div>
                <div className="metricas-table-row">
                    <span className="indicator orange" aria-hidden="true" />
                    <span>Latencia máxima</span>
                    <span>{latencyMax !== null ? `${latencyMax.toFixed(1)} ms` : '--'}</span>
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

            {errorMessage ? (
                <div className="metricas-alert" role="status" aria-live="polite">
                    {errorMessage}
                </div>
            ) : null}

            {isLoading ? (
                <div className="metricas-loading">Cargando métricas...</div>
            ) : null}
        </div>
    );
}
