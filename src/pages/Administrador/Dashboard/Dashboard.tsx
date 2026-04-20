import { useEffect, useMemo, useState } from 'react';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { useDashboard } from '../../../hooks/dashboard/useDashboard';
import { useDashboardReports } from '../../../hooks/reports/useDashboardReports';
import type {
    DashboardAdoptionHistoryResponse,
    DashboardBlockState,
    DashboardFunnelResponse,
    DashboardMetricNode,
    DashboardSeriesPoint,
    DashboardSeriesResponse
} from '../../../services/dashboard/dashboard.types';
import type {
    OperationalReportGenerationState,
    OperationalReportMetricNode,
    OperationalReportSeriesPoint,
    OperationalReportType
} from '../../../services/reports/reports.types';
import { getOperationalReportTypeLabel } from '../../../services/reports/reports.types';
import './Dashboard.css';

const MONTH_OPTIONS = [1, 3, 6, 12, 24, 36, 60, 120].map((value) => ({
    value: String(value),
    label: `${value} mes${value === 1 ? '' : 'es'}`
}));

const ADDITIONAL_REPORT_TYPES: OperationalReportType[] = [
    'security_compliance',
    'traceability_audit'
];

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
    report_job_id: 'ID de generacion'
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

function formatOperationalSeriesValue(point: OperationalReportSeriesPoint) {
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

function formatDateTime(value: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '--';
    return new Intl.DateTimeFormat('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(parsed);
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

function isMetricNodeEmpty(node: OperationalReportMetricNode | DashboardMetricNode): boolean {
    if (node === null) return true;
    if (typeof node === 'string') return node.trim().length === 0;
    if (typeof node === 'number' || typeof node === 'boolean') return false;
    if (Array.isArray(node)) return node.length === 0 || node.every((item) => isMetricNodeEmpty(item));
    const entries = Object.entries(node);
    if (entries.length === 0) return true;
    return entries.every(([, value]) => isMetricNodeEmpty(value));
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
    node: DashboardMetricNode | OperationalReportMetricNode;
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

function ReportSeriesTable({
    title,
    points
}: {
    title: string;
    points: OperationalReportSeriesPoint[];
}) {
    if (points.length === 0) return null;
    return (
        <div className="dashboard-report-subblock">
            <h5>{title}</h5>
            <div className="dashboard-table compact">
                <div className="dashboard-table-row head">
                    <span>Periodo</span>
                    <span>Valor</span>
                </div>
                {points.map((point, index) => (
                    <div className="dashboard-table-row" key={`${point.period}-${index}`}>
                        <span>{point.period}</span>
                        <span>{formatOperationalSeriesValue(point)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ReportGenerationOutput({
    state
}: {
    state: OperationalReportGenerationState | undefined;
}) {
    if (!state || state.status === 'idle') return null;

    if (state.status === 'loading') {
        return (
            <div className="dashboard-report-feedback is-loading" role="status" aria-live="polite">
                Generando reporte...
            </div>
        );
    }

    if (state.status === 'error' && state.error) {
        return (
            <div className="dashboard-report-feedback is-error" role="status" aria-live="polite">
                <strong>No se pudo generar el reporte</strong>
                <span>{state.error.message}</span>
                {state.error.status ? <small>HTTP {state.error.status}</small> : null}
            </div>
        );
    }

    if (state.status !== 'success' || !state.data) return null;

    const report = state.data;
    const adoptionHistory = report.dataset.adoption_history;

    return (
        <div className="dashboard-report-feedback is-success" role="status" aria-live="polite">
            <div className="dashboard-report-meta">
                <span><strong>Reporte:</strong> {report.report_type_label}</span>
                <span><strong>Periodo:</strong> {report.months} meses</span>
                <span><strong>ID:</strong> {report.report_job_id || '--'}</span>
                <span><strong>Generado:</strong> {formatDateTime(report.generated_at)}</span>
            </div>

            {adoptionHistory ? (
                <div className="dashboard-report-grid">
                    <div className="dashboard-report-block">
                        <h4>Volumen y crecimiento</h4>
                        {adoptionHistory.volume_and_growth_series.length > 0 ? (
                            <ReportSeriesTable
                                title="Serie temporal"
                                points={adoptionHistory.volume_and_growth_series}
                            />
                        ) : (
                            <MetricNodeView node={adoptionHistory.volume_and_growth} />
                        )}
                    </div>

                    <div className="dashboard-report-block">
                        <h4>Crecimiento de usuarios</h4>
                        {adoptionHistory.user_growth_series.length > 0 ? (
                            <ReportSeriesTable
                                title="Serie temporal"
                                points={adoptionHistory.user_growth_series}
                            />
                        ) : (
                            <MetricNodeView node={adoptionHistory.user_growth} />
                        )}
                    </div>

                    <div className="dashboard-report-block">
                        <h4>Conversion</h4>
                        <div className="dashboard-report-summary">
                            <div className="dashboard-report-summary-row">
                                <span>Creados</span>
                                <strong>{formatPrimitive(adoptionHistory.conversion_summary.created)}</strong>
                            </div>
                            <div className="dashboard-report-summary-row">
                                <span>Enviados</span>
                                <strong>{formatPrimitive(adoptionHistory.conversion_summary.submitted)}</strong>
                            </div>
                            <div className="dashboard-report-summary-row">
                                <span>Procesados</span>
                                <strong>{formatPrimitive(adoptionHistory.conversion_summary.processed)}</strong>
                            </div>
                            <div className="dashboard-report-summary-row">
                                <span>Conversion de creados a procesados</span>
                                <strong>{formatConversion(adoptionHistory.conversion_summary.conversion_created_to_processed)}</strong>
                            </div>
                        </div>
                        {!isMetricNodeEmpty(adoptionHistory.conversion) ? (
                            <MetricNodeView node={adoptionHistory.conversion} />
                        ) : null}
                    </div>

                    <div className="dashboard-report-block">
                        <h4>Capacidad operativa</h4>
                        <div className="dashboard-report-summary">
                            <div className="dashboard-report-summary-row">
                                <span>Sesiones procesadas</span>
                                <strong>{formatPrimitive(adoptionHistory.operational_capacity_summary.processed_sessions)}</strong>
                            </div>
                            <div className="dashboard-report-summary-row">
                                <span>Usuarios registrados</span>
                                <strong>{formatPrimitive(adoptionHistory.operational_capacity_summary.registered_users)}</strong>
                            </div>
                            <div className="dashboard-report-summary-row">
                                <span>Procesadas por usuario</span>
                                <strong>{formatPrimitive(adoptionHistory.operational_capacity_summary.processed_per_user)}</strong>
                            </div>
                        </div>
                        {!isMetricNodeEmpty(adoptionHistory.operational_capacity) ? (
                            <MetricNodeView node={adoptionHistory.operational_capacity} />
                        ) : null}
                    </div>
                </div>
            ) : (
                <p className="dashboard-empty">
                    El reporte se genero correctamente. Este tipo no trae un bloque estructurado de adopcion para mostrar en esta vista.
                </p>
            )}
        </div>
    );
}

function SectionReportAction({
    reportType,
    reportState,
    onGenerateReport
}: {
    reportType?: OperationalReportType;
    reportState?: OperationalReportGenerationState;
    onGenerateReport?: (reportType: OperationalReportType) => void;
}) {
    if (!reportType || !onGenerateReport) return null;
    const isLoading = reportState?.status === 'loading';
    return (
        <button
            type="button"
            className="dashboard-report-action"
            onClick={() => onGenerateReport(reportType)}
            disabled={isLoading}
        >
            {isLoading ? 'Generando...' : 'Generar reporte'}
        </button>
    );
}

function SectionSeries({
    title,
    state
}: {
    title: string;
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
                <h3>{title}</h3>
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
                        <span>{point.period}</span>
                        <span>{formatSeriesValue(point)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SectionFunnel({
    title,
    state,
    reportType,
    reportState,
    onGenerateReport
}: {
    title: string;
    state: DashboardBlockState<DashboardFunnelResponse>;
    reportType?: OperationalReportType;
    reportState?: OperationalReportGenerationState;
    onGenerateReport?: (reportType: OperationalReportType) => void;
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
                <SectionReportAction
                    reportType={reportType}
                    reportState={reportState}
                    onGenerateReport={onGenerateReport}
                />
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
            <ReportGenerationOutput state={reportState} />
        </section>
    );
}

function SectionAdoption({
    title,
    state,
    prioritized = false,
    reportType,
    reportState,
    onGenerateReport
}: {
    title: string;
    state: DashboardBlockState<DashboardAdoptionHistoryResponse>;
    prioritized?: boolean;
    reportType?: OperationalReportType;
    reportState?: OperationalReportGenerationState;
    onGenerateReport?: (reportType: OperationalReportType) => void;
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
                <h2>{title}</h2>
                <SectionReportAction
                    reportType={reportType}
                    reportState={reportState}
                    onGenerateReport={onGenerateReport}
                />
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
            <ReportGenerationOutput state={reportState} />
        </section>
    );
}

export default function Dashboard() {
    const { months, setMonths, blocks, isReloading, reload } = useDashboard();
    const { reportStates, generateReport } = useDashboardReports(months);
    const [monthsInput, setMonthsInput] = useState(String(months));
    const [showExtraReports, setShowExtraReports] = useState(false);

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
                    <div className="dashboard-extra-reports">
                        <button
                            type="button"
                            className="dashboard-extra-reports-toggle"
                            onClick={() => setShowExtraReports((prev) => !prev)}
                            aria-expanded={showExtraReports}
                        >
                            Reportes adicionales
                        </button>
                        {showExtraReports ? (
                            <div className="dashboard-extra-reports-menu">
                                {ADDITIONAL_REPORT_TYPES.map((reportType) => {
                                    const state = reportStates[reportType];
                                    const loading = state.status === 'loading';
                                    return (
                                        <button
                                            key={reportType}
                                            type="button"
                                            className="dashboard-extra-reports-item"
                                            onClick={() => {
                                                void generateReport(reportType);
                                            }}
                                            disabled={loading}
                                        >
                                            {loading ? 'Generando...' : getOperationalReportTypeLabel(reportType)}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : null}
                    </div>
                </div>
            </header>

            <div className="dashboard-divider" aria-hidden="true" />

            {hasCriticalAuthError ? (
                <div className="dashboard-global-alert" role="status" aria-live="polite">
                    Algunos bloques requieren permisos adicionales para tu sesion actual.
                </div>
            ) : null}

            {ADDITIONAL_REPORT_TYPES.some((reportType) => reportStates[reportType].status !== 'idle') ? (
                <section className="dashboard-additional-reports-results">
                    {ADDITIONAL_REPORT_TYPES.map((reportType) => {
                        const state = reportStates[reportType];
                        if (state.status === 'idle') return null;
                        return (
                            <div key={reportType} className="dashboard-additional-report-item">
                                <h3>{getOperationalReportTypeLabel(reportType)}</h3>
                                <ReportGenerationOutput state={state} />
                            </div>
                        );
                    })}
                </section>
            ) : null}

            <SectionAdoption
                title="Resumen ejecutivo"
                state={blocks.executiveSummary}
                prioritized
                reportType="executive_monthly"
                reportState={reportStates.executive_monthly}
                onGenerateReport={(reportType) => {
                    void generateReport(reportType);
                }}
            />
            <SectionAdoption
                title="Historico de adopcion"
                state={blocks.adoptionHistory}
                reportType="adoption_history"
                reportState={reportStates.adoption_history}
                onGenerateReport={(reportType) => {
                    void generateReport(reportType);
                }}
            />

            <section className="dashboard-funnel-grid">
                <SectionFunnel title="Embudo operativo" state={blocks.funnel} />
                <SectionFunnel
                    title="Productividad"
                    state={blocks.productivity}
                    reportType="operational_productivity"
                    reportState={reportStates.operational_productivity}
                    onGenerateReport={(reportType) => {
                        void generateReport(reportType);
                    }}
                />
                <SectionFunnel title="Revision humana" state={blocks.humanReview} />
            </section>

            <SectionSeries title="Crecimiento de usuarios" state={blocks.userGrowth} />

            <section className="dashboard-series-grid">
                <SectionSeries title="Volumen de cuestionarios" state={blocks.questionnaireVolume} />
                <SectionSeries title="Calidad de cuestionarios" state={blocks.questionnaireQuality} />
            </section>

            <section className="dashboard-series-grid">
                <SectionSeries title="Salud de API" state={blocks.apiHealth} />
                <SectionSeries title="Calidad de datos" state={blocks.dataQuality} />
            </section>

            <section className="dashboard-adoption-grid-wide">
                <SectionAdoption title="Drift" state={blocks.drift} />
                <SectionAdoption title="Equidad" state={blocks.equity} />
                <SectionAdoption
                    title="Monitoreo de modelos"
                    state={blocks.modelMonitoring}
                    reportType="model_monitoring"
                    reportState={reportStates.model_monitoring}
                    onGenerateReport={(reportType) => {
                        void generateReport(reportType);
                    }}
                />
                <SectionAdoption title="Retencion" state={blocks.retention} />
            </section>
        </div>
    );
}
