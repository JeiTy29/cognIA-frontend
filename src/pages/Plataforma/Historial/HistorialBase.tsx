import { useEffect, useMemo, useState } from 'react';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { AlertBadge } from '../../../components/AlertBadge/AlertBadge';
import { DashboardChartCard } from '../../../components/DashboardCharts';
import { ActiveFilterChips } from '../../../components/ActiveFilterChips/ActiveFilterChips';
import { QuestionnaireReportDetailModal } from '../../../components/questionnaires/QuestionnaireReportDetailModal';
import { useHistoryHasActiveFilters, useQuestionnaireHistoryV2 } from '../../../hooks/questionnaires/useQuestionnaireHistoryV2';
import {
    getGuardianDashboardV2,
    getPsychologistDashboardV2,
    getQuestionnaireCaseDetailV2,
    getQuestionnaireCasesV2
} from '../../../services/questionnaires/questionnaires.api';
import type {
    QuestionnaireCaseDetailV2Response,
    QuestionnaireCaseV2DTO,
    QuestionnaireDashboardChartPointDTO,
    QuestionnaireGuardianDashboardV2Response,
    QuestionnaireHistoryFiltersV2,
    QuestionnaireHistoryItemV2DTO,
    QuestionnairePsychologistDashboardV2Response
} from '../../../services/questionnaires/questionnaires.types';
import {
    formatDateTimeEsCO,
    getModeLabel,
    getRoleLabel,
    getStatusLabel,
    mapApiErrorToUserMessage
} from '../../../utils/presentation/naturalLanguage';
import { buildActiveFilterChips, buildHistoryKpis, normalizeChartSeries } from '../../../utils/questionnaires/dashboardTransform';
import {
    getDashboardDomainLabel,
    resolveCaseCompositeLabel,
    toHistoryStatusFilter,
    toOptionalFilterText
} from '../../../utils/questionnaires/dashboardLabels';
import {
    normalizeAlertLevel,
    normalizeDomainLabel
} from '../../../utils/questionnaires/presentation';
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
const pageSizeOptions = [{ value: '10', label: '10' }, { value: '20', label: '20' }, { value: '50', label: '50' }];
const domainOptions = [{ value: '', label: 'Todos' }, { value: 'adhd', label: 'TDAH' }, { value: 'conduct', label: 'Conducta' }, { value: 'anxiety', label: 'Ansiedad' }, { value: 'depression', label: 'Depresión' }, { value: 'elimination', label: 'Eliminación' }];
const alertOptions = [{ value: '', label: 'Todas' }, { value: 'low', label: 'Baja' }, { value: 'moderate', label: 'Moderada' }, { value: 'elevated', label: 'Elevada' }, { value: 'high', label: 'Alta' }, { value: 'critical_review', label: 'Revisión prioritaria' }];
const reviewOptions = [{ value: '', label: 'Todos' }, { value: 'true', label: 'Requiere revisión' }, { value: 'false', label: 'Sin revisión requerida' }];
const periodOptions = [{ value: '3', label: '3 meses' }, { value: '6', label: '6 meses' }, { value: '12', label: '12 meses' }];
function getString(value: unknown, fallback = '--') {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}
function toChartData(points: QuestionnaireDashboardChartPointDTO[] | null | undefined) {
    return normalizeChartSeries(points).map((item) => ({ id: item.id, label: item.label, value: item.value, tone: item.tone }));
}
function incrementChartBucket(map: Map<string, { label: string; value: number; tone?: string }>, key: string, label: string, tone?: string) {
    const current = map.get(key);
    map.set(key, { label, value: (current?.value ?? 0) + 1, tone: tone ?? current?.tone });
}
function readHistoryDate(item: QuestionnaireHistoryItemV2DTO) {
    return item.applied_at ?? item.submitted_at ?? item.processed_at ?? item.updated_at ?? item.created_at ?? null;
}
function formatHistoryMonth(value: string | null | undefined) {
    if (!value) return 'Sin fecha registrada';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return 'Sin fecha registrada';
    return new Intl.DateTimeFormat('es-CO', { month: 'short', year: '2-digit' }).format(date);
}
function chartRowsFromMap(map: Map<string, { label: string; value: number; tone?: string }>, limit = 6) {
    return [...map.entries()]
        .map(([id, item]) => ({ id, label: item.label, value: item.value, tone: item.tone }))
        .sort((left, right) => right.value - left.value)
        .slice(0, limit);
}
function buildFallbackHistoryCharts(items: QuestionnaireHistoryItemV2DTO[]) {
    const byDate = new Map<string, { label: string; value: number }>();
    const byCase = new Map<string, { label: string; value: number }>();
    const byDomain = new Map<string, { label: string; value: number }>();
    const byLevel = new Map<string, { label: string; value: number; tone?: string }>();

    items.forEach((item) => {
        const dateLabel = formatHistoryMonth(readHistoryDate(item));
        incrementChartBucket(byDate, dateLabel, dateLabel);
        const caseLabel = resolveHistoryItemCaseLabel(item);
        incrementChartBucket(byCase, item.case_id ?? item.case_public_id ?? caseLabel, caseLabel);

        const domainLabel = normalizeDomainLabel(item.dominant_domain);
        if (domainLabel !== 'Sin dominio predominante') {
            incrementChartBucket(byDomain, domainLabel, domainLabel);
        }

        if (item.latest_alert_level) {
            const alertLabel = normalizeAlertLevel(item.latest_alert_level);
            if (alertLabel && alertLabel !== '--') {
                incrementChartBucket(byLevel, alertLabel, alertLabel, item.latest_alert_level);
            }
        }
    });

    return {
        byDate: [...byDate.entries()].map(([id, item]) => ({ id, label: item.label, value: item.value })),
        byCase: chartRowsFromMap(byCase),
        byDomain: chartRowsFromMap(byDomain),
        byLevel: chartRowsFromMap(byLevel)
    };
}
function defaultFilters(): QuestionnaireHistoryFiltersV2 {
    return { status: undefined, q: '', case_label: '', case_public_id: '', tag: '', domain: '', alert_level: '', date_from: '', date_to: '', needs_professional_review: undefined };
}
function toMaybeBoolean(value: string) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
}
function normalizeDraftFilters(filters: QuestionnaireHistoryFiltersV2): QuestionnaireHistoryFiltersV2 {
    return {
        status: filters.status,
        q: toOptionalFilterText(filters.q ?? ''),
        case_label: toOptionalFilterText(filters.case_label ?? ''),
        case_public_id: toOptionalFilterText(filters.case_public_id ?? ''),
        tag: toOptionalFilterText(filters.tag ?? ''),
        domain: toOptionalFilterText(filters.domain ?? ''),
        alert_level: toOptionalFilterText(filters.alert_level ?? ''),
        date_from: toOptionalFilterText(filters.date_from ?? ''),
        date_to: toOptionalFilterText(filters.date_to ?? ''),
        needs_professional_review: filters.needs_professional_review
    };
}
function makeTitle(role: HistorialRole) {
    return role === 'padre' ? 'Historial de cuestionarios' : 'Evaluaciones recibidas e historial';
}
function makeDescription(role: HistorialRole) {
    return role === 'padre'
        ? 'Consulta cuestionarios aplicados, resultados orientativos y evolución por caso.'
        : 'Visualiza evaluaciones compartidas, alertas y estado de revisión.';
}
function resolveCaseLabel(caseItem: QuestionnaireCaseV2DTO) {
    return resolveCaseCompositeLabel(caseItem);
}
function resolveHistoryItemCaseLabel(item: QuestionnaireHistoryItemV2DTO) {
    const label = resolveCaseCompositeLabel({
        display_label: item.case_display_label,
        private_label: item.case_private_label,
        case_label: item.case_label,
        case_public_id: item.case_public_id,
        case_id: item.case_id
    });
    return label === 'Caso sin etiqueta' ? getString(item.title, 'Cuestionario sin caso') : label;
}
function summaryNumber(summary: Record<string, unknown> | null | undefined, keys: string[]) {
    if (!summary) return 0;
    for (const key of keys) {
        const value = Number(summary[key]);
        if (Number.isFinite(value)) return value;
    }
    return 0;
}
export function HistorialBase({ role }: Readonly<HistorialBaseProps>) {
    const history = useQuestionnaireHistoryV2({ initialFilters: { page: 1, page_size: 10 } });
    const [draftFilters, setDraftFilters] = useState<QuestionnaireHistoryFiltersV2>(() => defaultFilters());
    const [period, setPeriod] = useState('6');
    const [filtersOpen, setFiltersOpen] = useState(false);

    const [guardianDashboard, setGuardianDashboard] = useState<QuestionnaireGuardianDashboardV2Response | null>(null);
    const [guardianCases, setGuardianCases] = useState<QuestionnaireCaseV2DTO[]>([]);
    const [guardianError, setGuardianError] = useState<string | null>(null);

    const [psychologistDashboard, setPsychologistDashboard] = useState<QuestionnairePsychologistDashboardV2Response | null>(null);
    const [psychologistError, setPsychologistError] = useState<string | null>(null);
    const [psychologistLoading, setPsychologistLoading] = useState(role === 'psicologo');

    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const [selectedCaseDetail, setSelectedCaseDetail] = useState<QuestionnaireCaseDetailV2Response | null>(null);
    const [caseDetailLoading, setCaseDetailLoading] = useState(false);

    const [detailSessionId, setDetailSessionId] = useState<string | null>(null);

    const hasActiveFilters = useHistoryHasActiveFilters(history.filters);
    const filterChips = useMemo(() => buildActiveFilterChips(history.filters), [history.filters]);
    const kpis = useMemo(() => buildHistoryKpis(history.items, history.summary, history.total), [history.items, history.summary, history.total]);

    useEffect(() => {
        setDraftFilters((previous) => ({ ...previous, ...history.filters }));
    }, [history.filters]);

    useEffect(() => {
        if (role !== 'padre') return;
        const loadGuardian = async () => {
            setGuardianError(null);
            const dashboardPromise = getGuardianDashboardV2({
                months: Number(period),
                case_label: history.filters.case_label,
                case_public_id: history.filters.case_public_id,
                q: history.filters.q,
                domain: history.filters.domain,
                alert_level: history.filters.alert_level,
                date_from: history.filters.date_from,
                date_to: history.filters.date_to
            })
                .then((dashboard) => setGuardianDashboard(dashboard))
                .catch(() => setGuardianDashboard(null));

            const casesPromise = getQuestionnaireCasesV2({
                status: history.filters.status,
                q: history.filters.q,
                label: history.filters.case_label,
                case_public_id: history.filters.case_public_id,
                latest_alert_level: history.filters.alert_level,
                date_from: history.filters.date_from,
                date_to: history.filters.date_to,
                page: 1,
                page_size: 12
            })
                .then((cases) => setGuardianCases(cases.items))
                .catch((error) => {
                    setGuardianCases([]);
                    setGuardianError(mapApiErrorToUserMessage(error, 'No fue posible cargar los casos relacionados.'));
                });

            await Promise.allSettled([dashboardPromise, casesPromise]);
        };
        loadGuardian().catch(() => undefined);
    }, [history.filters.alert_level, history.filters.case_label, history.filters.case_public_id, history.filters.date_from, history.filters.date_to, history.filters.domain, history.filters.q, history.filters.status, period, role]);

    useEffect(() => {
        if (role !== 'psicologo') return;
        const loadPsychologist = async () => {
            setPsychologistLoading(true);
            setPsychologistError(null);
            try {
                const response = await getPsychologistDashboardV2({
                    q: history.filters.q,
                    case_public_id: history.filters.case_public_id,
                    date_from: history.filters.date_from,
                    date_to: history.filters.date_to,
                    domain: history.filters.domain,
                    alert_level: history.filters.alert_level,
                    review_status: history.filters.needs_professional_review === true ? 'pending' : history.filters.needs_professional_review === false ? 'reviewed' : undefined,
                    page: 1,
                    page_size: 12
                });
                setPsychologistDashboard(response);
            } catch (error) {
                setPsychologistError(mapApiErrorToUserMessage(error, 'No fue posible cargar evaluaciones recibidas.'));
            } finally {
                setPsychologistLoading(false);
            }
        };
        loadPsychologist().catch(() => undefined);
    }, [history.filters.alert_level, history.filters.case_public_id, history.filters.date_from, history.filters.date_to, history.filters.domain, history.filters.needs_professional_review, history.filters.q, role]);

    useEffect(() => {
        if (!selectedCaseId) {
            setSelectedCaseDetail(null);
            return;
        }
        const loadCase = async () => {
            setCaseDetailLoading(true);
            try {
                setSelectedCaseDetail(await getQuestionnaireCaseDetailV2(selectedCaseId));
            } catch {
                setSelectedCaseDetail(null);
            } finally {
                setCaseDetailLoading(false);
            }
        };
        loadCase().catch(() => undefined);
    }, [selectedCaseId]);

    const applyFilters = () => history.patchFilters({ ...normalizeDraftFilters(draftFilters), page: 1, page_size: history.pageSize });
    const clearFilters = () => {
        const cleaned = defaultFilters();
        setDraftFilters(cleaned);
        history.resetFilters();
    };
    const removeFilterChip = (key: string) => {
        history.patchFilters({ [key]: undefined, page: 1 } as Partial<QuestionnaireHistoryFiltersV2>);
        setDraftFilters((previous) => {
            const next = { ...previous } as Record<string, unknown>;
            next[key] = key === 'status' || key === 'needs_professional_review' ? undefined : '';
            return next as QuestionnaireHistoryFiltersV2;
        });
    };
    const openDetail = async (sessionId: string) => {
        setDetailSessionId(sessionId);
    };
    const closeDetail = () => {
        setDetailSessionId(null);
    };
    const historyCharts = useMemo(() => {
        const fallback = buildFallbackHistoryCharts(history.items);
        const byDate = toChartData(history.charts?.alerts_by_date ?? history.charts?.sessions_by_month);
        const byCase = toChartData(history.charts?.history_by_case ?? history.charts?.sessions_by_case);
        const byDomain = toChartData(history.charts?.alerts_by_domain);
        const byLevel = toChartData(history.charts?.alerts_by_level);
        return {
            byDate: byDate.length > 0 ? byDate : fallback.byDate,
            byCase: byCase.length > 0 ? byCase : fallback.byCase,
            byDomain: byDomain.length > 0 ? byDomain : fallback.byDomain,
            byLevel: byLevel.length > 0 ? byLevel : fallback.byLevel
        };
    }, [history.charts, history.items]);
    const guardianCharts = {
        byMonth: toChartData(guardianDashboard?.charts?.alerts_by_month),
        byDomain: toChartData(guardianDashboard?.charts?.alerts_by_domain),
        byCase: toChartData(guardianDashboard?.charts?.sessions_by_case),
        byAlert: toChartData(guardianDashboard?.charts?.cases_by_alert_level)
    };
    const hasGuardianCharts = Object.values(guardianCharts).some((items) => items.length > 0);
    const psychologistCharts = {
        byDomain: toChartData(psychologistDashboard?.charts?.alerts_by_domain ?? psychologistDashboard?.aggregates?.by_domain),
        byLevel: toChartData(psychologistDashboard?.charts?.alerts_by_level ?? psychologistDashboard?.aggregates?.by_alert_level),
        byStatus: toChartData(psychologistDashboard?.charts?.reviews_by_status ?? psychologistDashboard?.aggregates?.by_review_status),
        byDate: toChartData(psychologistDashboard?.charts?.alerts_by_date ?? psychologistDashboard?.aggregates?.by_date)
    };
    const leadingDomain = (role === 'padre' ? guardianCharts.byDomain : psychologistCharts.byDomain)[0]?.label ?? 'Sin dominio dominante';
    const leadingAlert = historyCharts.byLevel[0]?.label ?? 'Sin alerta dominante';
    const executiveCopy = role === 'padre'
        ? `Durante el periodo seleccionado se registraron ${kpis.total} cuestionarios, ${kpis.processed} procesados y ${kpis.withAlert} con alertas visibles. El dominio más frecuente es ${leadingDomain}.`
        : `Durante el periodo seleccionado hay ${kpis.total} evaluaciones visibles, ${kpis.needsReview} requieren revisión y la alerta predominante es ${leadingAlert}.`;
    const filterSummary = filterChips.length > 0
        ? `${filterChips.length} filtros activos`
        : role === 'padre'
            ? `Periodo base: ${period} meses, todos los estados visibles`
            : 'Sin filtros activos, mostrando evaluaciones disponibles';

    const showFrom = history.total === 0 ? 0 : (history.page - 1) * history.pageSize + 1;
    const showTo = history.total === 0 ? 0 : Math.min(history.page * history.pageSize, history.total);

    return (
        <div className="plataforma-view historial-dashboard-view">
            <section className="historial-dashboard" aria-label={makeTitle(role)}>
                <header className="historial-dashboard-header">
                    <div><h1>{makeTitle(role)}</h1><p>{makeDescription(role)}</p></div>
                    <div className="historial-dashboard-actions">
                        <button type="button" className="historial-dashboard-btn" onClick={() => history.reload().catch(() => undefined)}>Actualizar</button>
                        <button type="button" className="historial-dashboard-btn secondary" onClick={clearFilters}>Limpiar filtros</button>
                    </div>
                </header>

                <section className="historial-dashboard-insight" aria-label="Resumen ejecutivo del historial">
                    <div>
                        <span>Lectura rápida</span>
                        <h2>{role === 'padre' ? `${kpis.total} cuestionarios - ${kpis.withAlert} con alerta` : `${kpis.total} evaluaciones - ${kpis.needsReview} por revisar`}</h2>
                        <p>{executiveCopy}</p>
                    </div>
                    <strong>{leadingDomain}</strong>
                </section>

                <section className={`historial-dashboard-filters ${filtersOpen ? 'is-open' : 'is-collapsed'}`}>
                    <div className="historial-dashboard-filters-summary">
                        <div>
                            <strong>Filtros</strong>
                            <span>{filterSummary}</span>
                        </div>
                        <button
                            type="button"
                            className="historial-dashboard-btn secondary"
                            onClick={() => setFiltersOpen((value) => !value)}
                            aria-expanded={filtersOpen}
                        >
                            {filtersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
                        </button>
                    </div>
                    {filtersOpen ? (
                        <div className="historial-dashboard-filters-grid">
                        <label>Estado<CustomSelect value={draftFilters.status ?? ''} options={statusOptions} onChange={(value) => setDraftFilters((prev) => ({ ...prev, status: toHistoryStatusFilter(value) }))} ariaLabel="Filtrar por estado" /></label>
                        <label>Caso/etiqueta<input type="text" value={draftFilters.case_label ?? ''} onChange={(event) => setDraftFilters((prev) => ({ ...prev, case_label: event.target.value }))} /></label>
                        <label>Caso público<input type="text" value={draftFilters.case_public_id ?? ''} onChange={(event) => setDraftFilters((prev) => ({ ...prev, case_public_id: event.target.value }))} /></label>
                        <label>Tag<input type="text" value={draftFilters.tag ?? ''} onChange={(event) => setDraftFilters((prev) => ({ ...prev, tag: event.target.value }))} /></label>
                        <label>Dominio<CustomSelect value={draftFilters.domain ?? ''} options={domainOptions} onChange={(value) => setDraftFilters((prev) => ({ ...prev, domain: value }))} ariaLabel="Filtrar por dominio" /></label>
                        <label>Alerta<CustomSelect value={draftFilters.alert_level ?? ''} options={alertOptions} onChange={(value) => setDraftFilters((prev) => ({ ...prev, alert_level: value }))} ariaLabel="Filtrar por alerta" /></label>
                        <label>Desde<input type="date" value={draftFilters.date_from ?? ''} onChange={(event) => setDraftFilters((prev) => ({ ...prev, date_from: event.target.value }))} /></label>
                        <label>Hasta<input type="date" value={draftFilters.date_to ?? ''} onChange={(event) => setDraftFilters((prev) => ({ ...prev, date_to: event.target.value }))} /></label>
                        <label>Buscar<input type="text" value={draftFilters.q ?? ''} onChange={(event) => setDraftFilters((prev) => ({ ...prev, q: event.target.value }))} /></label>
                        <label>Revisión<CustomSelect value={draftFilters.needs_professional_review === undefined ? '' : String(draftFilters.needs_professional_review)} options={reviewOptions} onChange={(value) => setDraftFilters((prev) => ({ ...prev, needs_professional_review: toMaybeBoolean(value) }))} ariaLabel="Filtrar por revisión profesional" /></label>
                        {role === 'padre' ? <label>Periodo<CustomSelect value={period} options={periodOptions} onChange={setPeriod} ariaLabel="Periodo" /></label> : null}
                    </div>
                    ) : null}
                    {filtersOpen ? (
                        <div className="historial-dashboard-filter-actions">
                            <button type="button" className="historial-dashboard-btn" onClick={applyFilters}>Aplicar filtros</button>
                            <button type="button" className="historial-dashboard-btn secondary" onClick={clearFilters}>Resetear</button>
                        </div>
                    ) : null}
                    <ActiveFilterChips chips={filterChips} onRemove={removeFilterChip} />
                </section>

                <section className="historial-dashboard-kpis">
                    <article className="historial-dashboard-kpi-card"><span>Total registros</span><strong>{kpis.total}</strong></article>
                    <article className="historial-dashboard-kpi-card"><span>Procesados</span><strong>{kpis.processed}</strong></article>
                    <article className="historial-dashboard-kpi-card"><span>Con alerta</span><strong>{kpis.withAlert}</strong></article>
                    <article className="historial-dashboard-kpi-card"><span>Requieren revisión</span><strong>{kpis.needsReview}</strong></article>
                    <article className="historial-dashboard-kpi-card"><span>Sin caso asociado</span><strong>{kpis.withoutCase}</strong></article>
                    <article className="historial-dashboard-kpi-card">
                        <span>{role === 'padre' ? 'Casos con alerta' : 'Casos visibles'}</span>
                        <strong>{role === 'padre' ? summaryNumber(guardianDashboard?.summary, ['cases_with_alerts', 'cases_alerts']) : summaryNumber(psychologistDashboard?.summary, ['cases_visible', 'total_cases'])}</strong>
                    </article>
                </section>

                <section className="historial-dashboard-charts">
                    <DashboardChartCard title="Actividad por mes" data={historyCharts.byDate} loading={history.loading} variant="area" />
                    <DashboardChartCard title="Actividad por caso o hijo" data={historyCharts.byCase} loading={history.loading} />
                    <DashboardChartCard title="Alertas por dominio" data={historyCharts.byDomain} loading={history.loading} />
                    <DashboardChartCard title="Alertas por nivel" data={historyCharts.byLevel} loading={history.loading} variant="donut" />
                </section>

                {role === 'padre' ? (
                    <section className="historial-dashboard-role-block">
                        {guardianError ? <div className="historial-dashboard-alert error">{guardianError}</div> : null}
                        {hasGuardianCharts ? (
                            <div className="historial-dashboard-charts">
                                <DashboardChartCard title="Alertas por mes" data={guardianCharts.byMonth} variant="area" />
                                <DashboardChartCard title="Alertas por dominio" data={guardianCharts.byDomain} />
                                <DashboardChartCard title="Cuestionarios por caso" data={guardianCharts.byCase} />
                                <DashboardChartCard title="Casos por alerta" data={guardianCharts.byAlert} variant="donut" />
                            </div>
                        ) : null}
                        <div className="historial-dashboard-cases-grid">
                            {guardianCases.map((caseItem) => (
                                <article className="historial-dashboard-case-card" key={caseItem.case_id}>
                                    <h3>{resolveCaseLabel(caseItem)}</h3>
                                    <div><strong>Código del caso:</strong> {getString(caseItem.case_public_id)}</div>
                                    <div><strong>Cuestionarios:</strong> {caseItem.sessions_count ?? 0}</div>
                                    <div><strong>Procesadas:</strong> {caseItem.processed_sessions_count ?? 0}</div>
                                    <div className="historial-dashboard-card-inline"><strong>Última alerta:</strong> <AlertBadge level={caseItem.latest_alert_level} /></div>
                                    <div><strong>Dominio:</strong> {getDashboardDomainLabel(caseItem.latest_domain)}</div>
                                    <button type="button" className="historial-dashboard-btn" onClick={() => setSelectedCaseId(caseItem.case_id)}>Ver detalle</button>
                                </article>
                            ))}
                        </div>
                        {selectedCaseId ? (
                            <div className="historial-dashboard-case-detail">
                                <div className="historial-dashboard-case-detail-header">
                                    <h3>Detalle del caso</h3>
                                    <button type="button" className="historial-dashboard-btn secondary" onClick={() => setSelectedCaseId(null)}>Cerrar detalle</button>
                                </div>
                                {caseDetailLoading ? <div className="historial-dashboard-empty">Cargando detalle del caso...</div> : null}
                                {!caseDetailLoading && selectedCaseDetail ? (
                                    <>
                                        <div className="historial-dashboard-charts">
                                            <DashboardChartCard title="Resumen por dominio" data={toChartData(selectedCaseDetail.domain_summary)} />
                                            <DashboardChartCard title="Tendencia del caso" data={toChartData(selectedCaseDetail.trend)} variant="line" />
                                        </div>
                                        <div className="historial-dashboard-session-list">
                                            {selectedCaseDetail.sessions.map((item) => (
                                                <article className="historial-dashboard-session-card" key={item.id}>
                                                    <div className="historial-dashboard-card-inline"><strong>{resolveHistoryItemCaseLabel(item)}</strong><AlertBadge level={item.latest_alert_level} /></div>
                                                    <div><strong>Estado:</strong> {getStatusLabel(item.status)}</div>
                                                    <div><strong>Dominio:</strong> {getDashboardDomainLabel(item.dominant_domain)}</div>
                                                    <div><strong>Fecha:</strong> {formatDateTimeEsCO(item.processed_at ?? item.updated_at)}</div>
                                                    <button type="button" className="historial-dashboard-btn" onClick={() => openDetail(item.id).catch(() => undefined)}>Ver reporte</button>
                                                </article>
                                            ))}
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        ) : null}
                    </section>
                ) : (
                    <section className="historial-dashboard-role-block">
                        {psychologistError ? <div className="historial-dashboard-alert error">{psychologistError}</div> : null}
                        <div className="historial-dashboard-charts">
                            <DashboardChartCard title="Alertas por dominio" data={psychologistCharts.byDomain} loading={psychologistLoading} />
                            <DashboardChartCard title="Alertas por nivel" data={psychologistCharts.byLevel} loading={psychologistLoading} variant="donut" />
                            <DashboardChartCard title="Revisiones por estado" data={psychologistCharts.byStatus} loading={psychologistLoading} variant="donut" />
                            <DashboardChartCard title="Alertas por fecha" data={psychologistCharts.byDate} loading={psychologistLoading} variant="area" />
                        </div>
                    </section>
                )}

                <section className="historial-dashboard-list">
                    <div className="historial-dashboard-list-header">
                        <div>
                            <h2>Cuestionarios y casos recientes</h2>
                            <p>Selecciona un registro para revisar resultados, respuestas, PDF o revisión profesional.</p>
                        </div>
                        <div>Mostrando {showFrom}-{showTo} de {history.total}</div>
                    </div>
                    {history.error ? <div className="historial-dashboard-alert error">{history.error}</div> : null}
                    {history.loading ? <div className="historial-dashboard-empty">Cargando registros...</div> : null}
                    {!history.loading && history.items.length === 0 ? <div className="historial-dashboard-empty">{hasActiveFilters ? 'No hay resultados para los filtros aplicados.' : 'Aún no hay cuestionarios registrados.'}</div> : null}
                    <div className="historial-dashboard-session-list">
                        {history.items.map((item) => (
                            <article className="historial-dashboard-session-card" key={item.id}>
                                <div className="historial-dashboard-card-inline"><strong>{resolveHistoryItemCaseLabel(item)}</strong><AlertBadge level={item.latest_alert_level} /></div>
                                <div><strong>Estado:</strong> {getStatusLabel(item.status)}</div>
                                <div><strong>Modo:</strong> {getModeLabel(item.mode)}</div>
                                <div><strong>Rol:</strong> {getRoleLabel(item.role)}</div>
                                <div><strong>Dominio:</strong> {getDashboardDomainLabel(item.dominant_domain)}</div>
                                <div><strong>Creado:</strong> {formatDateTimeEsCO(item.created_at)}</div>
                                <button type="button" className="historial-dashboard-btn" onClick={() => openDetail(item.id).catch(() => undefined)}>Ver detalle</button>
                            </article>
                        ))}
                    </div>
                    <div className="historial-dashboard-pagination">
                        <label>Tamaño<CustomSelect value={String(history.pageSize)} options={pageSizeOptions} onChange={(value) => history.changePageSize(Number(value))} ariaLabel="Cambiar tamaño de página" /></label>
                        <button type="button" className="historial-dashboard-btn secondary" onClick={() => history.setPage(Math.max(1, history.page - 1))} disabled={history.page <= 1}>Anterior</button>
                        <span>Página {history.page} de {Math.max(1, history.pages)}</span>
                        <button type="button" className="historial-dashboard-btn secondary" onClick={() => history.setPage(Math.min(Math.max(1, history.pages), history.page + 1))} disabled={history.page >= Math.max(1, history.pages)}>Siguiente</button>
                    </div>
                </section>
            </section>
            <QuestionnaireReportDetailModal
                isOpen={detailSessionId !== null}
                sessionId={detailSessionId}
                role={role}
                onClose={closeDetail}
                onDataChanged={() => history.reload()}
            />
        </div>
    );
}
