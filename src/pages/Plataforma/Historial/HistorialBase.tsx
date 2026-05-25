import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    AreaChart,
    DashboardEmptyState,
    DashboardMetricCard,
    DashboardSection,
    DonutChart,
    TimelineChart,
    TreemapChart
} from '../../../components/DashboardCharts';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { QuestionnaireReportDetailModal } from '../../../components/questionnaires/QuestionnaireReportDetailModal';
import { useQuestionnaireHistoryV2 } from '../../../hooks/questionnaires/useQuestionnaireHistoryV2';
import {
    getQuestionnaireHistoryResultsV2,
    getQuestionnaireHistoryV2,
    getQuestionnaireReportPreviewV2
} from '../../../services/questionnaires/questionnaires.api';
import type {
    QuestionnaireHistoryItemV2DTO,
    QuestionnaireHistoryStatusFilter,
    QuestionnaireReportPreviewDTO,
    QuestionnaireSecureResultsV2DTO
} from '../../../services/questionnaires/questionnaires.types';
import {
    buildCountsMap,
    buildMonthlyCountItems,
    buildTimelineItems,
    formatHistoryTimelineDescription,
    mapCountsToItems,
    resolveHistoryItemAlert,
    resolveHistorySessionDate
} from '../../../utils/dashboard/dashboardData';
import { formatMonthLabel } from '../../../utils/dashboard/chartFormatters';
import {
    formatDateTimeEsCO,
    getModeLabel,
    getRoleLabel,
    getStatusLabel
} from '../../../utils/presentation/naturalLanguage';
import { normalizeBackendText } from '../../../utils/questionnaires/presentation';
import './HistorialBase.css';

type HistorialRole = 'padre' | 'psicologo';

interface HistorialBaseProps {
    role: HistorialRole;
}

const DASHBOARD_HISTORY_PAGE_SIZE = 100;
const ALERT_DETAILS_CONCURRENCY = 4;

const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'draft', label: 'Borrador' },
    { value: 'in_progress', label: 'En progreso' },
    { value: 'submitted', label: 'Enviado' },
    { value: 'processed', label: 'Procesado' },
    { value: 'failed', label: 'Fallido' },
    { value: 'archived', label: 'Archivado' }
];

const pageSizeOptions = [
    { value: '10', label: '10' },
    { value: '20', label: '20' },
    { value: '50', label: '50' }
];

function resolveSessionTitle(item: QuestionnaireHistoryItemV2DTO, index: number) {
    const named = normalizeBackendText(item.title ?? item.name, '');
    if (named && named !== '--') return named;

    const mode = normalizeBackendText(getModeLabel(item.mode, ''), '');
    const status = normalizeBackendText(getStatusLabel(item.status, ''), '');
    if (mode && status) return `${mode} · ${status}`;

    return `Registro ${index + 1}`;
}

function resolveHistoryCaseLabel(item: QuestionnaireHistoryItemV2DTO) {
    const caseRecord = item.case;
    const label = normalizeBackendText(
        caseRecord?.display_label ??
        caseRecord?.private_label ??
        item.case_display_label ??
        item.case_private_label ??
        item.case_label ??
        caseRecord?.case_public_id ??
        item.case_public_id,
        ''
    );

    return label ? `Caso: ${label}` : 'Sin caso asociado';
}

function resolveHistorySessionKey(item: QuestionnaireHistoryItemV2DTO) {
    return item.session_id ?? item.questionnaire_session_id ?? item.id;
}

function mapDashboardHistoryError() {
    return 'No fue posible cargar el resumen analítico del historial.';
}

export function HistorialBase({ role }: Readonly<HistorialBaseProps>) {
    const location = useLocation();
    const navigate = useNavigate();
    const initialLocationState = (location.state ?? {}) as { openHistorySessionId?: string } | null;
    const {
        items,
        page,
        pageSize,
        total,
        pages,
        statusFilter,
        loading,
        error,
        setPage,
        setStatusFilter,
        changePageSize,
        reload
    } = useQuestionnaireHistoryV2();

    const [detailSessionId, setDetailSessionId] = useState<string | null>(initialLocationState?.openHistorySessionId ?? null);
    const [dashboardHistoryItems, setDashboardHistoryItems] = useState<QuestionnaireHistoryItemV2DTO[]>([]);
    const [dashboardHistoryLoading, setDashboardHistoryLoading] = useState(true);
    const [dashboardHistoryError, setDashboardHistoryError] = useState<string | null>(null);
    const [dashboardLoadedAllPages, setDashboardLoadedAllPages] = useState(true);
    const [dashboardAlertSources, setDashboardAlertSources] = useState<Record<string, QuestionnaireSecureResultsV2DTO | QuestionnaireReportPreviewDTO | null>>({});

    const dashboardCacheRef = useRef<Record<string, QuestionnaireHistoryItemV2DTO[]>>({});
    const dashboardAlertCacheRef = useRef<Record<string, QuestionnaireSecureResultsV2DTO | QuestionnaireReportPreviewDTO | null>>({});

    const loadAllHistoryItemsForDashboard = useCallback(async (nextStatusFilter: QuestionnaireHistoryStatusFilter | '') => {
        const cacheKey = nextStatusFilter || 'all';
        const cached = dashboardCacheRef.current[cacheKey];
        if (cached) {
            setDashboardHistoryItems(cached);
            setDashboardLoadedAllPages(true);
            setDashboardHistoryError(null);
            setDashboardHistoryLoading(false);
            return;
        }

        setDashboardHistoryLoading(true);
        setDashboardHistoryError(null);
        try {
            const firstPage = await getQuestionnaireHistoryV2({
                status: nextStatusFilter || undefined,
                page: 1,
                page_size: DASHBOARD_HISTORY_PAGE_SIZE
            });
            const totalPages = Math.max(1, firstPage.pagination.pages ?? 1);
            const additionalPages = totalPages > 1
                ? await Promise.all(
                    Array.from({ length: totalPages - 1 }, (_, index) =>
                        getQuestionnaireHistoryV2({
                            status: nextStatusFilter || undefined,
                            page: index + 2,
                            page_size: DASHBOARD_HISTORY_PAGE_SIZE
                        })
                    )
                )
                : [];

            const allItems = [firstPage, ...additionalPages].flatMap((response) => response.items ?? []);
            dashboardCacheRef.current[cacheKey] = allItems;
            setDashboardHistoryItems(allItems);
            setDashboardLoadedAllPages(true);
        } catch {
            setDashboardHistoryItems([]);
            setDashboardLoadedAllPages(false);
            setDashboardHistoryError(mapDashboardHistoryError());
        } finally {
            setDashboardHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        const locationState = (location.state ?? {}) as { openHistorySessionId?: string } | null;
        if (!locationState?.openHistorySessionId) return;
        navigate(location.pathname, { replace: true, state: {} });
    }, [location.pathname, location.state, navigate]);

    useEffect(() => {
        loadAllHistoryItemsForDashboard(statusFilter).catch(() => undefined);
    }, [loadAllHistoryItemsForDashboard, statusFilter]);

    useEffect(() => {
        let cancelled = false;

        const missingAlertItems = dashboardHistoryItems.filter((item) => {
            if (resolveHistoryItemAlert(item)) return false;
            const status = normalizeBackendText(item.status, '').toLowerCase();
            if (status !== 'processed') return false;
            const sessionKey = resolveHistorySessionKey(item);
            return Boolean(sessionKey) && !(sessionKey in dashboardAlertCacheRef.current);
        });

        if (missingAlertItems.length === 0) {
            setDashboardAlertSources((previous) => ({ ...previous, ...dashboardAlertCacheRef.current }));
            return undefined;
        }

        async function worker(queue: QuestionnaireHistoryItemV2DTO[]) {
            while (queue.length > 0) {
                const current = queue.shift();
                if (!current) return;
                const sessionKey = resolveHistorySessionKey(current);
                if (!sessionKey || sessionKey in dashboardAlertCacheRef.current) continue;

                try {
                    const results = await getQuestionnaireHistoryResultsV2(sessionKey);
                    const hasDomains = Array.isArray(results.domains) && results.domains.length > 0;
                    dashboardAlertCacheRef.current[sessionKey] = hasDomains ? results : await getQuestionnaireReportPreviewV2(sessionKey);
                } catch {
                    try {
                        dashboardAlertCacheRef.current[sessionKey] = await getQuestionnaireReportPreviewV2(sessionKey);
                    } catch {
                        dashboardAlertCacheRef.current[sessionKey] = null;
                    }
                }
            }
        }

        const queue = [...missingAlertItems];
        Promise.all(
            Array.from({ length: Math.min(ALERT_DETAILS_CONCURRENCY, queue.length) }, () => worker(queue))
        ).then(() => {
            if (cancelled) return;
            setDashboardAlertSources((previous) => ({ ...previous, ...dashboardAlertCacheRef.current }));
        }).catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, [dashboardHistoryItems]);

    const title = 'Historial de cuestionarios';
    const historyContextLabel = role === 'psicologo' ? 'psicólogo' : 'padre o tutor';
    const totalPages = Math.max(1, pages);
    const currentPage = Math.min(Math.max(page, 1), totalPages);
    const showFrom = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const showTo = total === 0 ? 0 : Math.min(currentPage * pageSize, total);
    const dashboardNote = dashboardLoadedAllPages
        ? 'Resumen calculado sobre todo el historial disponible.'
        : 'Resumen calculado sobre los registros cargados para el dashboard.';

    const statusSummaryItems = useMemo(
        () =>
            mapCountsToItems(
                buildCountsMap(
                    dashboardHistoryItems.map((item) => item.status),
                    (value) => normalizeBackendText(getStatusLabel(value), 'No disponible')
                )
            ),
        [dashboardHistoryItems]
    );

    const sessionsByMonth = useMemo(
        () => buildMonthlyCountItems(dashboardHistoryItems.map((item) => resolveHistorySessionDate(item))),
        [dashboardHistoryItems]
    );

    const caseSummaryItems = useMemo(() => {
        const labels = dashboardHistoryItems.map((item) => {
            const rawLabel =
                item.case?.display_label ??
                item.case?.private_label ??
                item.case_display_label ??
                item.case_private_label ??
                item.case_label ??
                item.case_public_id ??
                'Sin caso';
            return normalizeBackendText(rawLabel, 'Sin caso');
        });
        return mapCountsToItems(buildCountsMap(labels));
    }, [dashboardHistoryItems]);

    const alertTimelineItems = useMemo(() => {
        const candidateItems = dashboardHistoryItems
            .map((item, index) => ({
                item,
                index,
                alert: resolveHistoryItemAlert(item, dashboardAlertSources[resolveHistorySessionKey(item)] ?? null)
            }))
            .filter((entry) => Boolean(entry.alert));

        return buildTimelineItems(candidateItems, {
            getDate: ({ item }) => resolveHistorySessionDate(item),
            getTitle: ({ item, index }) => normalizeBackendText(resolveSessionTitle(item, index), 'Sesión'),
            getDescription: ({ item, alert }) => formatHistoryTimelineDescription({ item, alert }),
            getTone: ({ alert }) => {
                const alertLabel = alert?.alertLabel.toLowerCase() ?? '';
                if (alertLabel.includes('alto') || alertLabel.includes('prioritaria')) return 'danger';
                if (alertLabel.includes('elevado') || alertLabel.includes('moderado')) return 'warning';
                if (alertLabel.includes('bajo')) return 'success';
                return 'info';
            }
        });
    }, [dashboardAlertSources, dashboardHistoryItems]);

    const processedCount = useMemo(
        () => dashboardHistoryItems.filter((item) => normalizeBackendText(item.status, '').toLowerCase() === 'processed').length,
        [dashboardHistoryItems]
    );
    const sessionsWithoutCase = useMemo(
        () => dashboardHistoryItems.filter((item) => !item.case && !item.case_id && !item.case_public_id).length,
        [dashboardHistoryItems]
    );

    const historyRowsContent = useMemo(() => {
        if (loading) {
            return <div className="historial-v2-empty">Cargando historial...</div>;
        }

        if (items.length === 0) {
            return <div className="historial-v2-empty">No hay sesiones para mostrar.</div>;
        }

        return items.map((item: QuestionnaireHistoryItemV2DTO, index) => {
            const sessionTitle = resolveSessionTitle(item, index);
            const caseLabel = resolveHistoryCaseLabel(item);

            return (
                <div className="historial-v2-row" key={item.id}>
                    <div className="historial-v2-primary-cell" title={`${sessionTitle}\n${caseLabel}`}>
                        <strong className="historial-v2-primary-title">{sessionTitle}</strong>
                        <span className="historial-v2-case-ref">{caseLabel}</span>
                    </div>
                    <div>{normalizeBackendText(getStatusLabel(item.status), '--')}</div>
                    <div>{normalizeBackendText(getModeLabel(item.mode), '--')}</div>
                    <div>{normalizeBackendText(getRoleLabel(item.role), '--')}</div>
                    <div>{formatDateTimeEsCO(item.created_at)}</div>
                    <div>{formatDateTimeEsCO(item.updated_at)}</div>
                    <div className="historial-v2-actions">
                        <button type="button" className="historial-v2-btn" onClick={() => setDetailSessionId(item.id)}>
                            Ver
                        </button>
                    </div>
                </div>
            );
        });
    }, [items, loading]);

    return (
        <div className="plataforma-view">
            <section className="historial-v2" aria-label={`Historial de cuestionarios para ${historyContextLabel}`}>
                <div className="historial-v2-header">
                    <h1>{title}</h1>
                </div>

                <div className="historial-v2-divider" />

                <div className="historial-v2-controls">
                    <label>
                        Estado
                        <CustomSelect
                            value={statusFilter}
                            options={statusOptions}
                            onChange={setStatusFilter}
                            ariaLabel="Filtrar historial por estado"
                        />
                    </label>
                </div>

                {dashboardHistoryError ? <div className="historial-v2-alert error">{dashboardHistoryError}</div> : null}
                {error ? <div className="historial-v2-alert error">{error}</div> : null}

                <div className="historial-v2-table">
                    <div className="historial-v2-head">
                        <div>Sesión</div>
                        <div>Estado</div>
                        <div>Modo</div>
                        <div>Rol</div>
                        <div>Creado</div>
                        <div>Actualizado</div>
                        <div>Acciones</div>
                    </div>
                    <div className="historial-v2-body">{historyRowsContent}</div>
                </div>

                <div className="historial-v2-pagination">
                    <div>Mostrando {showFrom}-{showTo} de {total}</div>
                    <div className="historial-v2-pagination-right">
                        <label>
                            Tamaño
                            <CustomSelect
                                value={String(pageSize)}
                                options={pageSizeOptions}
                                onChange={(value) => changePageSize(Number(value))}
                                ariaLabel="Cambiar tamaño de página de historial"
                            />
                        </label>
                        <button
                            type="button"
                            className="historial-v2-page-btn"
                            onClick={() => setPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage <= 1}
                            aria-label="Página anterior"
                        >
                            <span className="historial-v2-page-arrow" aria-hidden="true">‹</span>
                        </button>
                        <span>Página {currentPage} de {totalPages}</span>
                        <button
                            type="button"
                            className="historial-v2-page-btn"
                            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage >= totalPages}
                            aria-label="Página siguiente"
                        >
                            <span className="historial-v2-page-arrow" aria-hidden="true">›</span>
                        </button>
                    </div>
                </div>

                <section className="historial-v2-dashboard-block" aria-label="Resumen visual del historial">
                    <div className="historial-v2-dashboard-header">
                        <h2>Resumen visual del historial</h2>
                        <p>{dashboardNote}</p>
                    </div>

                    <div className="historial-v2-dashboard">
                        <div className="historial-v2-dashboard-metrics">
                            <DashboardMetricCard label="Sesiones del dashboard" value={dashboardHistoryItems.length} helper={dashboardNote} tone="info" />
                            <DashboardMetricCard label="Procesadas" value={processedCount} helper="Sesiones procesadas dentro del historial filtrado." tone="success" />
                            <DashboardMetricCard label="Sin caso" value={sessionsWithoutCase} helper="Registros sin asociación visible a un caso." tone="warning" />
                            <DashboardMetricCard label="Con alerta visible" value={alertTimelineItems.length} helper="Sesiones con alerta o dominio dominante identificable." tone="neutral" />
                        </div>

                        <DashboardSection
                            title="Sesiones por estado"
                            description="Distribuye las sesiones del historial según su estado actual."
                            note={dashboardNote}
                        >
                            {dashboardHistoryLoading ? (
                                <DashboardEmptyState message="Cargando el resumen analítico del historial..." />
                            ) : (
                                <DonutChart
                                    data={statusSummaryItems}
                                    ariaLabel="Distribución de sesiones por estado"
                                    emptyMessage="No hay datos suficientes para generar esta gráfica en el periodo seleccionado."
                                />
                            )}
                        </DashboardSection>

                        <DashboardSection
                            title="Historial por caso"
                            description="Permite identificar si las evaluaciones se encuentran organizadas por casos o si existen sesiones sin asociación."
                            note={dashboardNote}
                        >
                            {dashboardHistoryLoading ? (
                                <DashboardEmptyState message="Cargando el resumen analítico del historial..." />
                            ) : (
                                <TreemapChart
                                    data={caseSummaryItems}
                                    ariaLabel="Distribución del historial por caso"
                                    emptyMessage="No hay datos suficientes para generar esta gráfica en el periodo seleccionado."
                                />
                            )}
                        </DashboardSection>

                        <DashboardSection
                            className="historial-v2-dashboard-wide historial-v2-dashboard-large"
                            title="Sesiones realizadas por mes"
                            description="Muestra la frecuencia de registros realizados a lo largo del tiempo."
                            note={dashboardNote}
                        >
                            {dashboardHistoryLoading ? (
                                <DashboardEmptyState message="Cargando el resumen analítico del historial..." />
                            ) : (
                                <AreaChart
                                    data={sessionsByMonth}
                                    ariaLabel="Frecuencia de sesiones realizadas por mes"
                                    emptyMessage="No hay datos suficientes para generar esta gráfica en el periodo seleccionado."
                                    xLabelFormatter={formatMonthLabel}
                                />
                            )}
                        </DashboardSection>

                        <DashboardSection
                            className="historial-v2-dashboard-wide historial-v2-dashboard-large"
                            title="Línea de alertas históricas"
                            description="Resume los momentos en los que se registraron alertas más relevantes."
                            note={dashboardNote}
                        >
                            {dashboardHistoryLoading ? (
                                <DashboardEmptyState message="Cargando el resumen analítico del historial..." />
                            ) : alertTimelineItems.length > 0 ? (
                                <TimelineChart
                                    items={alertTimelineItems}
                                    ariaLabel="Línea de alertas históricas"
                                    emptyMessage="No hay datos suficientes para generar esta gráfica en el periodo seleccionado."
                                />
                            ) : (
                                <DashboardEmptyState message="No hay datos suficientes para generar esta gráfica en el periodo seleccionado." />
                            )}
                        </DashboardSection>
                    </div>
                </section>
            </section>

            <QuestionnaireReportDetailModal
                isOpen={detailSessionId !== null}
                sessionId={detailSessionId}
                role={role}
                onClose={() => setDetailSessionId(null)}
                onDataChanged={reload}
            />
        </div>
    );
}
