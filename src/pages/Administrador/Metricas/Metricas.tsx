import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import './Metricas.css';
import { useMetrics } from '../../../hooks/metrics/useMetrics';

type ServiceState = 'ok' | 'loading' | 'error';
type DatabaseState = 'ready' | 'not_ready' | 'error' | 'loading';
type StatusDonutProps = Readonly<{
    counts: Record<'200' | '401' | '500', number>;
}>;

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

function resolveServiceAccentClass(status: ServiceState) {
    if (status === 'ok') return 'accent-green';
    if (status === 'error') return 'accent-red';
    return 'accent-blue';
}

function resolveServiceStatusDotClass(status: ServiceState) {
    if (status === 'ok') return 'status-ok';
    if (status === 'error') return 'status-error';
    return 'status-warn';
}

function resolveServiceStatusLabel(status: ServiceState) {
    if (status === 'ok') return 'OK';
    if (status === 'loading') return 'Cargando';
    return 'No disponible';
}

function resolveDatabaseBadgeLabel(status: DatabaseState) {
    if (status === 'ready') return 'OK';
    if (status === 'loading') return 'Cargando';
    return 'No disponible';
}

function resolveDatabaseStatusDotClass(status: DatabaseState) {
    if (status === 'ready') return 'status-ok';
    if (status === 'loading') return 'status-warn';
    return 'status-error';
}

function resolveDatabaseAccentClass(status: DatabaseState) {
    if (status === 'ready') return 'accent-green';
    if (status === 'loading') return 'accent-blue';
    return 'accent-red';
}

function StatusDonut({ counts }: StatusDonutProps) {
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
        <svg className="metricas-donut" viewBox="0 0 80 80" aria-label="Conteo de estados HTTP">
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
    const location = useLocation();
    const metricsViewEnabled = location.pathname === '/admin/metricas';
    const {
        serverState,
        dbState,
        emailState,
        snapshot,
        metricsDisabled,
        errorMessage,
        isLoading,
        requestHistory,
        latencyHistory,
        reload
    } = useMetrics({ enabled: metricsViewEnabled });

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

    const dbBadgeLabel = resolveDatabaseBadgeLabel(dbState.status);
    const dbStatusDot = resolveDatabaseStatusDotClass(dbState.status);
    const dbAccentClass = resolveDatabaseAccentClass(dbState.status);
    const serverAccentClass = resolveServiceAccentClass(serverState.status);
    const serverStatusDot = resolveServiceStatusDotClass(serverState.status);
    const serverStatusLabel = resolveServiceStatusLabel(serverState.status);
    const emailAccentClass = resolveServiceAccentClass(emailState.status);
    const emailStatusDot = resolveServiceStatusDotClass(emailState.status);

    return (
        <div className="metricas">
            <header className="metricas-header">
                <div>
                    <h1>Metricas del sistema</h1>
                </div>
            </header>
            <div className="metricas-divider" aria-hidden="true" />

            <section className="metricas-row">
                <div className={`metricas-block ${serverAccentClass}`}>
                    <div className="metricas-block-title">Estado del servidor</div>
                    <div className="metricas-status">
                        <span className={`status-dot ${serverStatusDot}`} aria-hidden="true" />
                        <span className="status-label">{serverStatusLabel}</span>
                    </div>
                    <div className="metricas-small">
                        {serverState.status === 'ok' ? 'Servidor operativo' : 'No disponible'}
                    </div>
                    <div className="metricas-micro">{serverState.detail || 'Sin interrupciones registradas'}</div>
                </div>

                <div className={`metricas-block ${dbAccentClass}`}>
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

                <div className={`metricas-block ${emailAccentClass}`}>
                    <div className="metricas-block-title">Servicio de correo</div>
                    <div className="metricas-status">
                        <span className={`status-dot ${emailStatusDot}`} aria-hidden="true" />
                        <span className="status-label">{emailState.label}</span>
                    </div>
                    <div className="metricas-small">{emailState.detail}</div>
                    <div className="metricas-micro">{emailState.reason ?? 'Sin detalle adicional'}</div>
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
                                    <svg className="metricas-sparkline" viewBox="0 0 120 40" aria-label="Tendencia de latencia">
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
                                    <svg className="metricas-sparkline" viewBox="0 0 120 40" aria-label="Tendencia de solicitudes">
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
                    </div>
                </section>
            )}

            <section className="metricas-table" aria-label="Detalle de metricas">
                <div className="metricas-table-row header">
                    <span aria-hidden="true" />
                    <span>Indicador</span>
                    <span>Valor</span>
                    <span>Detalle</span>
                </div>
                <div className="metricas-table-row">
                    <span className="indicator green" aria-hidden="true" />
                    <span>Uptime</span>
                    <span>{uptimeLabel}</span>
                    <span>Tiempo activo continuo del servicio.</span>
                </div>
                <div className="metricas-table-row">
                    <span className="indicator blue" aria-hidden="true" />
                    <span>Solicitudes</span>
                    <span>{requestsTotal ?? '--'}</span>
                    <span>Trafico acumulado desde el arranque.</span>
                </div>
                <div className="metricas-table-row">
                    <span className="indicator teal" aria-hidden="true" />
                    <span>Latencia promedio</span>
                    <span>{latencyAvg !== null ? `${latencyAvg.toFixed(1)} ms` : '--'}</span>
                    <span>Tiempo medio de respuesta.</span>
                </div>
                <div className="metricas-table-row">
                    <span className="indicator orange" aria-hidden="true" />
                    <span>Latencia maxima</span>
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
                <div className="metricas-loading">Cargando metricas...</div>
            ) : null}
        </div>
    );
}
