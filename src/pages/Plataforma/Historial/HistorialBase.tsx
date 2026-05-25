import { useEffect, useMemo, useState } from 'react';
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
import type { QuestionnaireHistoryItemV2DTO } from '../../../services/questionnaires/questionnaires.types';
import {
    buildCountsMap,
    buildMonthlyCountItems,
    buildTimelineItems,
    mapCountsToItems
} from '../../../utils/dashboard/dashboardData';
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

    useEffect(() => {
        const locationState = (location.state ?? {}) as { openHistorySessionId?: string } | null;
        if (!locationState?.openHistorySessionId) return;
        navigate(location.pathname, { replace: true, state: {} });
    }, [location.pathname, location.state, navigate]);

    const title = 'Historial de cuestionarios';
    const historyContextLabel = role === 'psicologo' ? 'psicólogo' : 'padre o tutor';
    const totalPages = Math.max(1, pages);
    const currentPage = Math.min(Math.max(page, 1), totalPages);
    const showFrom = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const showTo = total === 0 ? 0 : Math.min(currentPage * pageSize, total);
    const statusSummaryItems = useMemo(
        () => mapCountsToItems(buildCountsMap(items.map((item) => item.status), (value) => normalizeBackendText(getStatusLabel(value), 'No disponible'))),
        [items]
    );
    const sessionsByMonth = useMemo(
        () => buildMonthlyCountItems(items.map((item) => item.updated_at ?? item.created_at ?? null)),
        [items]
    );
    const caseSummaryItems = useMemo(() => {
        const labels = items.map((item) => {
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
    }, [items]);
    const alertTimelineItems = useMemo(() => {
        const candidateItems = items.filter((item) => {
            const record = item as Record<string, unknown>;
            return Boolean(record.alert_level ?? record.highest_alert_level ?? record.latest_alert_level);
        });
        return buildTimelineItems(candidateItems, {
            getDate: (item) => item.updated_at ?? item.created_at,
            getTitle: (item) => normalizeBackendText(resolveSessionTitle(item, 0), 'Sesión'),
            getDescription: (item) => {
                const record = item as Record<string, unknown>;
                return `${resolveHistoryCaseLabel(item)} · ${normalizeBackendText(getStatusLabel(item.status), '--')} · ${normalizeBackendText(String(record.alert_level ?? record.highest_alert_level ?? record.latest_alert_level ?? '--'), '--')}`;
            }
        });
    }, [items]);
    const processedCount = useMemo(() => items.filter((item) => item.status === 'processed').length, [items]);
    const sessionsWithoutCase = useMemo(() => items.filter((item) => !item.case && !item.case_id && !item.case_public_id).length, [items]);

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

                <div className="historial-v2-dashboard">
                    <div className="historial-v2-dashboard-metrics">
                        <DashboardMetricCard label="Sesiones cargadas" value={items.length} helper="Resumen calculado sobre los resultados cargados." tone="info" />
                        <DashboardMetricCard label="Procesadas" value={processedCount} helper="Estado procesado dentro de la muestra visible." tone="success" />
                        <DashboardMetricCard label="Sin caso" value={sessionsWithoutCase} helper="Registros sin asociación visible a un caso." tone="warning" />
                    </div>
                    <DashboardSection
                        title="Sesiones por estado"
                        description="Distribuye las sesiones del historial según su estado actual."
                        note="Resumen calculado sobre los resultados cargados."
                    >
                        <DonutChart
                            data={statusSummaryItems}
                            ariaLabel="Distribución de sesiones por estado"
                            emptyMessage="No hay datos suficientes para generar esta gráfica en el periodo seleccionado."
                        />
                    </DashboardSection>
                    <DashboardSection
                        title="Sesiones realizadas por mes"
                        description="Muestra la frecuencia de registros realizados a lo largo del tiempo."
                        note="Resumen calculado sobre los resultados cargados."
                    >
                        <AreaChart
                            data={sessionsByMonth}
                            ariaLabel="Frecuencia de sesiones realizadas por mes"
                            emptyMessage="No hay datos suficientes para generar esta gráfica en el periodo seleccionado."
                        />
                    </DashboardSection>
                    <DashboardSection
                        title="Historial por caso"
                        description="Permite identificar si las evaluaciones se encuentran organizadas por casos o si existen sesiones sin asociación."
                        note="Resumen calculado sobre los resultados cargados."
                    >
                        <TreemapChart
                            data={caseSummaryItems}
                            ariaLabel="Distribución del historial por caso"
                            emptyMessage="No hay datos suficientes para generar esta gráfica en el periodo seleccionado."
                        />
                    </DashboardSection>
                    <DashboardSection
                        title="Línea de alertas históricas"
                        description="Resume los momentos en los que se registraron alertas más relevantes."
                        note="Solo se grafica si las sesiones cargadas exponen datos de alerta."
                    >
                        {alertTimelineItems.length > 0 ? (
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
