import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { Modal } from '../../../components/Modal/Modal';
import { useMetrics, type StatusCounts } from '../../../hooks/metrics/useMetrics';
import type { EmailHealthBlockState } from '../../../services/admin/emailHealth';
import { downloadMetricsReportPdf } from '../../../utils/reports/admin/metricsReport';
import '../AdminShared.css';
import './Metricas.css';

type ServiceState = 'ok' | 'loading' | 'error';
type DatabaseState = 'ready' | 'not_ready' | 'error' | 'loading';

type GroupedStatusCounts = {
    success: number;
    redirect: number;
    clientError: number;
    serverError: number;
    other: number;
};

type StatusDonutProps = Readonly<{
    counts: Record<string, number>;
}>;

type MetricsReportModalState = {
    months: '3' | '6' | '12';
    includeEmailHealth: boolean;
    includeHttpDistribution: boolean;
    includeModelMonitoring: boolean;
    includeDataQuality: boolean;
};

const DONUT_GROUPS = [
    { key: 'success', label: '2xx exitosas', color: '#1f9d55', legendClass: 'legend-green', indicatorClass: 'green' },
    { key: 'redirect', label: '3xx redirecciones', color: '#3e6ea8', legendClass: 'legend-blue', indicatorClass: 'blue' },
    { key: 'clientError', label: '4xx cliente/autorizacion', color: '#f0ad4e', legendClass: 'legend-yellow', indicatorClass: 'yellow' },
    { key: 'serverError', label: '5xx servidor', color: '#dc3545', legendClass: 'legend-red', indicatorClass: 'red' },
    { key: 'other', label: 'Otros', color: '#6a6f7d', legendClass: 'legend-gray', indicatorClass: 'gray' }
] as const;

const metricsReportMonthOptions = [
    { value: '3', label: '3 meses' },
    { value: '6', label: '6 meses' },
    { value: '12', label: '12 meses' }
];

const defaultMetricsReportModal = (): MetricsReportModalState => ({
    months: '6',
    includeEmailHealth: true,
    includeHttpDistribution: true,
    includeModelMonitoring: true,
    includeDataQuality: true
});

function formatUptime(seconds: number | null | undefined) {
    if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return '--';

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.length > 0 ? parts.join(' ') : 'menos de 1m';
}

function formatLatencyMs(value: number | null | undefined) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
    if (value >= 100) return `${Math.round(value)} ms`;
    if (value >= 10) return `${value.toFixed(1)} ms`;
    return `${value.toFixed(2)} ms`;
}

function formatDateTime(value: Date | null) {
    if (!value) return '--';
    return new Intl.DateTimeFormat('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(value);
}

function formatCompactNumber(value: number | null | undefined) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
    return new Intl.NumberFormat('es-CO').format(value);
}

function buildSparklinePath(values: number[], width = 120, height = 40) {
    const points = values.filter((value) => Number.isFinite(value));
    if (points.length === 0) return '';
    if (points.length === 1) {
        const centerY = height / 2;
        return `M 0 ${centerY} L ${width} ${centerY}`;
    }

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const stepX = width / (points.length - 1);

    return points.map((point, index) => {
        const x = stepX * index;
        const y = height - ((point - min) / range) * (height - 4) - 2;
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');
}

function renderSparkline(values: number[], label: string) {
    const path = buildSparklinePath(values);
    return (
        <svg className="metricas-sparkline" viewBox="0 0 120 40" role="img" aria-label={label}>
            <path
                d="M 0 38 L 120 38"
                stroke="rgba(11, 58, 104, 0.12)"
                strokeWidth="1"
                fill="none"
            />
            {path ? <path className="sparkline-path" d={path} fill="none" /> : null}
        </svg>
    );
}

function resolveServiceAccentClass(status: ServiceState) {
    if (status === 'ok') return 'accent-green';
    if (status === 'loading') return 'accent-blue';
    return 'accent-red';
}

function resolveServiceStatusDotClass(status: ServiceState) {
    if (status === 'ok') return 'status-ok';
    if (status === 'loading') return 'status-warn';
    return 'status-error';
}

function resolveServiceStatusLabel(status: ServiceState) {
    if (status === 'ok') return 'OK';
    if (status === 'loading') return 'Cargando';
    return 'No disponible';
}

function resolveDatabaseBadgeLabel(status: DatabaseState) {
    if (status === 'ready') return 'Lista';
    if (status === 'not_ready') return 'En espera';
    if (status === 'loading') return 'Cargando';
    return 'Con error';
}

function resolveDatabaseStatusDotClass(status: DatabaseState) {
    if (status === 'ready') return 'status-ok';
    if (status === 'loading' || status === 'not_ready') return 'status-warn';
    return 'status-error';
}

function resolveDatabaseAccentClass(status: DatabaseState) {
    if (status === 'ready') return 'accent-green';
    if (status === 'loading' || status === 'not_ready') return 'accent-blue';
    return 'accent-red';
}

function groupStatusCounts(counts: Record<string, number>): GroupedStatusCounts {
    const grouped: GroupedStatusCounts = {
        success: 0,
        redirect: 0,
        clientError: 0,
        serverError: 0,
        other: 0
    };

    for (const [key, rawValue] of Object.entries(counts)) {
        const value = typeof rawValue === 'number' && Number.isFinite(rawValue) ? rawValue : 0;
        if (value <= 0) continue;

        const statusCode = Number.parseInt(key, 10);
        if (!Number.isFinite(statusCode)) {
            grouped.other += value;
            continue;
        }

        if (statusCode >= 200 && statusCode < 300) {
            grouped.success += value;
        } else if (statusCode >= 300 && statusCode < 400) {
            grouped.redirect += value;
        } else if (statusCode >= 400 && statusCode < 500) {
            grouped.clientError += value;
        } else if (statusCode >= 500 && statusCode < 600) {
            grouped.serverError += value;
        } else {
            grouped.other += value;
        }
    }

    return grouped;
}

function formatStatusPercent(value: number, total: number) {
    if (total <= 0 || value <= 0) return '0%';
    const percent = (value / total) * 100;
    const rounded = percent >= 10 ? Math.round(percent) : Math.round(percent * 10) / 10;
    return `${rounded}%`;
}

function renderStatusBreakdown(groups: GroupedStatusCounts, total: number) {
    if (total <= 0) {
        return <div className="metricas-note">Sin solicitudes registradas</div>;
    }

    return (
        <div className="metricas-legend">
            {DONUT_GROUPS.map((group) => {
                const value = groups[group.key];
                if (value <= 0) return null;

                return (
                    <div key={group.key}>
                        <span className={`legend-dot ${group.legendClass}`} />
                        {group.label} — {formatCompactNumber(value)} ({formatStatusPercent(value, total)})
                    </div>
                );
            })}
        </div>
    );
}

function StatusDonut({ counts }: StatusDonutProps) {
    const groups = groupStatusCounts(counts);
    const total = Object.values(groups).reduce((sum, value) => sum + value, 0);
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    let currentOffset = 0;

    return (
        <svg className="metricas-donut" viewBox="0 0 80 80" role="img" aria-label="Distribucion de solicitudes por familia HTTP">
            <circle
                cx="40"
                cy="40"
                r={radius}
                fill="none"
                stroke="#e5eef7"
                strokeWidth="12"
            />
            {total > 0 ? DONUT_GROUPS.map((group) => {
                const value = groups[group.key];
                if (value <= 0) return null;

                const segmentLength = (value / total) * circumference;
                const dashArray = `${segmentLength} ${circumference - segmentLength}`;
                const dashOffset = -currentOffset;
                currentOffset += segmentLength;

                return (
                    <circle
                        key={group.key}
                        className="donut-ring"
                        cx="40"
                        cy="40"
                        r={radius}
                        fill="none"
                        stroke={group.color}
                        strokeWidth="12"
                        strokeDasharray={dashArray}
                        strokeDashoffset={dashOffset}
                        transform="rotate(-90 40 40)"
                    />
                );
            }) : null}
            <circle cx="40" cy="40" r="20" fill="#ffffff" />
            <text x="40" y="37" textAnchor="middle" fontSize="8" fill="#526476">
                Total
            </text>
            <text x="40" y="47" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0b2540">
                {formatCompactNumber(total)}
            </text>
        </svg>
    );
}

function renderEmailReason(emailState: EmailHealthBlockState) {
    return emailState.reason ?? 'Sin detalle adicional';
}

function renderPrimaryStatusCodeSummary(counts: StatusCounts) {
    const entries = Object.entries(counts)
        .filter(([, value]) => value > 0)
        .sort((left, right) => right[1] - left[1])
        .slice(0, 4);

    if (entries.length === 0) return 'Sin solicitudes registradas';
    return entries.map(([code, value]) => `${code}: ${formatCompactNumber(value)}`).join(', ');
}

export function Metricas() {
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
        lastUpdated,
        requestHistory,
        latencyHistory,
        reload,
        isRefreshing
    } = useMetrics({ enabled: metricsViewEnabled });
    const [reportWorking, setReportWorking] = useState(false);
    const [reportNotice, setReportNotice] = useState<string | null>(null);
    const [reportError, setReportError] = useState<string | null>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportForm, setReportForm] = useState<MetricsReportModalState>(defaultMetricsReportModal);

    const statusCounts = useMemo(() => snapshot?.status_counts ?? {}, [snapshot]);
    const groupedStatus = useMemo(() => groupStatusCounts(statusCounts), [statusCounts]);
    const totalStatus = useMemo(
        () => Object.values(groupedStatus).reduce((sum, value) => sum + value, 0),
        [groupedStatus]
    );

    const handleDownloadReport = async () => {
        if (!snapshot) {
            setReportError('No se pudo generar el reporte porque no fue posible cargar los datos principales.');
            return;
        }

        setReportWorking(true);
        setReportNotice(null);
        setReportError(null);
        try {
            await downloadMetricsReportPdf({
                serverState,
                dbState,
                emailState,
                snapshot,
                lastUpdated,
                options: {
                    months: Number(reportForm.months),
                    includeEmailHealth: reportForm.includeEmailHealth,
                    includeHttpDistribution: reportForm.includeHttpDistribution,
                    includeModelMonitoring: reportForm.includeModelMonitoring,
                    includeDataQuality: reportForm.includeDataQuality
                }
            });
            setIsReportModalOpen(false);
            setReportNotice('Reporte descargado correctamente.');
        } catch {
            setReportError('No se pudo generar el reporte. Intenta nuevamente.');
        } finally {
            setReportWorking(false);
        }
    };

    return (
        <main className="metricas">
            <header className="metricas-header">
                <div>
                    <h1>Métricas del sistema</h1>
                    <p className="metricas-small">
                        Estado operativo del backend, latencia, distribución de solicitudes y disponibilidad de servicios.
                    </p>
                </div>
                <div className="metricas-actions">
                    <button
                        type="button"
                        className="metricas-refresh metricas-report-btn"
                        onClick={() => setIsReportModalOpen(true)}
                        disabled={reportWorking}
                    >
                        {reportWorking ? 'Generando reporte...' : 'Descargar reporte'}
                    </button>
                    <button
                        type="button"
                        className="metricas-refresh"
                        onClick={reload}
                        disabled={isRefreshing}
                    >
                        {isRefreshing ? 'Actualizando...' : 'Actualizar'}
                    </button>
                </div>
            </header>

            <div className="metricas-divider" />
            {reportNotice ? <div className="metricas-alert metricas-alert-success">{reportNotice}</div> : null}
            {reportError ? <div className="metricas-alert">{reportError}</div> : null}

            {metricsDisabled ? (
                <section className="metricas-disabled">
                    <strong>Métricas deshabilitadas</strong>
                    <span>El sistema no está exponiendo métricas en este momento.</span>
                </section>
            ) : null}

            <section className="metricas-row">
                <article className={`metricas-block ${resolveServiceAccentClass(serverState.status)}`}>
                    <span className="metricas-block-title">Servidor</span>
                    <div className="metricas-status">
                        <span className={`status-dot ${resolveServiceStatusDotClass(serverState.status)}`} />
                        <span className="status-label">{resolveServiceStatusLabel(serverState.status)}</span>
                    </div>
                    <strong className={`metricas-value ${resolveServiceStatusDotClass(serverState.status)}`}>
                        {serverState.message}
                    </strong>
                    <span className="metricas-small">{serverState.detail}</span>
                    <span className="metricas-micro">Última actualización: {formatDateTime(lastUpdated)}</span>
                </article>

                <article className={`metricas-block ${resolveDatabaseAccentClass(dbState.status)}`}>
                    <span className="metricas-block-title">Base de datos</span>
                    <div className="metricas-status">
                        <span className={`status-dot ${resolveDatabaseStatusDotClass(dbState.status)}`} />
                        <span className="status-label">{resolveDatabaseBadgeLabel(dbState.status)}</span>
                    </div>
                    <strong className={`metricas-value ${resolveDatabaseStatusDotClass(dbState.status)}`}>
                        {formatLatencyMs(dbState.latency_ms)}
                    </strong>
                    <span className="metricas-small">Latencia reportada para el servicio de persistencia.</span>
                    <div className="metricas-latency">
                        <span className="metricas-latency-icon">●</span>
                        <div className="metricas-latency-bar" aria-hidden="true">
                            <span style={{ width: `${Math.min(100, Math.max(6, (dbState.latency_ms ?? 0) / 2))}%` }} />
                        </div>
                    </div>
                </article>

                <article className={`metricas-block ${resolveServiceAccentClass(emailState.status)}`}>
                    <span className="metricas-block-title">Servicio de correo</span>
                    <div className="metricas-status">
                        <span className={`status-dot ${resolveServiceStatusDotClass(emailState.status)}`} />
                        <span className="status-label">{resolveServiceStatusLabel(emailState.status)}</span>
                    </div>
                    <strong className={`metricas-value ${resolveServiceStatusDotClass(emailState.status)}`}>
                        {emailState.label}
                    </strong>
                    <span className="metricas-small">{emailState.detail}</span>
                    <span className="metricas-micro">{renderEmailReason(emailState)}</span>
                </article>
            </section>

            {errorMessage ? <div className="metricas-alert">{errorMessage}</div> : null}
            {isLoading && !snapshot ? <div className="metricas-loading">Cargando métricas...</div> : null}

            {snapshot ? (
                <>
                    <section className="metricas-snapshot">
                        <div className="metricas-snapshot-main">
                            <h2>Snapshot de métricas</h2>
                            <div className="metricas-grid">
                                <div>
                                    <span className="metricas-label">Tiempo activo</span>
                                    <div className="metricas-value">{formatUptime(snapshot.uptime_seconds)}</div>
                                    <span className="metricas-small">Tiempo continuo desde el arranque del servicio.</span>
                                </div>
                                <div>
                                    <span className="metricas-label">Solicitudes acumuladas</span>
                                    <div className="metricas-value">{formatCompactNumber(snapshot.requests_total)}</div>
                                    <span className="metricas-small">Tráfico acumulado desde el arranque.</span>
                                    {renderSparkline(requestHistory, 'Historial de solicitudes')}
                                </div>
                                <div>
                                    <span className="metricas-label">Latencia promedio</span>
                                    <div className="metricas-value">{formatLatencyMs(snapshot.latency_ms_avg)}</div>
                                    <span className="metricas-small">Promedio general de tiempo de respuesta.</span>
                                    {renderSparkline(latencyHistory, 'Historial de latencia')}
                                </div>
                                <div>
                                    <span className="metricas-label">Latencia máxima</span>
                                    <div className="metricas-value">{formatLatencyMs(snapshot.latency_ms_max)}</div>
                                    <span className="metricas-small">Pico máximo observado en el periodo reportado.</span>
                                </div>
                            </div>
                        </div>

                        <aside className="metricas-snapshot-side">
                            <div>
                                <span className="metricas-label">Distribución de respuestas</span>
                                <StatusDonut counts={statusCounts} />
                            </div>
                            {renderStatusBreakdown(groupedStatus, totalStatus)}
                            <div className="metricas-note">
                                Principales códigos: {renderPrimaryStatusCodeSummary(statusCounts)}
                            </div>
                        </aside>
                    </section>

                    <section className="metricas-table" aria-label="Tabla resumen de métricas">
                        <div className="metricas-table-row header">
                            <span />
                            <span>Métrica</span>
                            <span>Valor</span>
                            <span>Observación</span>
                        </div>

                        <div className="metricas-table-row">
                            <span className="indicator green" />
                            <span>HTTP 2xx</span>
                            <span>{formatCompactNumber(groupedStatus.success)}</span>
                            <span>Solicitudes exitosas.</span>
                        </div>
                        <div className="metricas-table-row">
                            <span className="indicator blue" />
                            <span>HTTP 3xx</span>
                            <span>{formatCompactNumber(groupedStatus.redirect)}</span>
                            <span>Redirecciones registradas por el backend o infraestructura.</span>
                        </div>
                        <div className="metricas-table-row">
                            <span className="indicator yellow" />
                            <span>HTTP 4xx</span>
                            <span>{formatCompactNumber(groupedStatus.clientError)}</span>
                            <span>Errores del cliente, validación o autorización.</span>
                        </div>
                        <div className="metricas-table-row">
                            <span className="indicator red" />
                            <span>HTTP 5xx</span>
                            <span>{formatCompactNumber(groupedStatus.serverError)}</span>
                            <span>Errores internos del servidor.</span>
                        </div>
                        <div className="metricas-table-row">
                            <span className="indicator gray" />
                            <span>Otros códigos</span>
                            <span>{formatCompactNumber(groupedStatus.other)}</span>
                            <span>Estados fuera de las familias HTTP más comunes.</span>
                        </div>
                    </section>
                </>
            ) : null}

            <Modal
                isOpen={isReportModalOpen}
                onClose={() => {
                    if (reportWorking) return;
                    setIsReportModalOpen(false);
                }}
            >
                <div className="admin-report-modal">
                    <h2>Configurar reporte de métricas</h2>
                    <p>Selecciona el periodo y los bloques complementarios que deseas incluir dentro del PDF.</p>

                    <div className="admin-report-grid">
                        <label>
                            <span>Periodo dashboard</span>
                            <CustomSelect
                                ariaLabel="Periodo dashboard para el reporte"
                                value={reportForm.months}
                                options={metricsReportMonthOptions}
                                onChange={(value) =>
                                    setReportForm((prev) => ({ ...prev, months: value as MetricsReportModalState['months'] }))
                                }
                            />
                        </label>
                    </div>

                    <div className="admin-report-checkbox">
                        <input
                            id="metrics-report-email"
                            type="checkbox"
                            checked={reportForm.includeEmailHealth}
                            onChange={(event) =>
                                setReportForm((prev) => ({ ...prev, includeEmailHealth: event.target.checked }))
                            }
                        />
                        <label htmlFor="metrics-report-email">
                            <strong>Incluir salud del correo</strong>
                            <span>Agrega el estado actual del servicio de correo dentro del PDF.</span>
                        </label>
                    </div>

                    <div className="admin-report-checkbox">
                        <input
                            id="metrics-report-http"
                            type="checkbox"
                            checked={reportForm.includeHttpDistribution}
                            onChange={(event) =>
                                setReportForm((prev) => ({ ...prev, includeHttpDistribution: event.target.checked }))
                            }
                        />
                        <label htmlFor="metrics-report-http">
                            <strong>Incluir distribución HTTP</strong>
                            <span>Resume las familias 2xx, 3xx, 4xx, 5xx y otros.</span>
                        </label>
                    </div>

                    <div className="admin-report-checkbox">
                        <input
                            id="metrics-report-models"
                            type="checkbox"
                            checked={reportForm.includeModelMonitoring}
                            onChange={(event) =>
                                setReportForm((prev) => ({ ...prev, includeModelMonitoring: event.target.checked }))
                            }
                        />
                        <label htmlFor="metrics-report-models">
                            <strong>Incluir monitoreo de modelos</strong>
                            <span>Agrega seguimiento de modelos, drift y equidad si están disponibles.</span>
                        </label>
                    </div>

                    <div className="admin-report-checkbox">
                        <input
                            id="metrics-report-quality"
                            type="checkbox"
                            checked={reportForm.includeDataQuality}
                            onChange={(event) =>
                                setReportForm((prev) => ({ ...prev, includeDataQuality: event.target.checked }))
                            }
                        />
                        <label htmlFor="metrics-report-quality">
                            <strong>Incluir calidad de datos</strong>
                            <span>Usa información agregada de dashboard solo dentro del reporte.</span>
                        </label>
                    </div>

                    <div className="admin-report-actions">
                        <button
                            type="button"
                            className="admin-btn ghost"
                            onClick={() => setIsReportModalOpen(false)}
                            disabled={reportWorking}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="admin-btn primary"
                            onClick={() => {
                                handleDownloadReport().catch(() => undefined);
                            }}
                            disabled={reportWorking}
                        >
                            {reportWorking ? 'Generando PDF...' : 'Generar PDF'}
                        </button>
                    </div>
                </div>
            </Modal>
        </main>
    );
}

export default Metricas;
