import { useEffect, useMemo, useState } from 'react';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { Modal } from '../../../components/Modal/Modal';
import { AlertBadge } from '../../../components/AlertBadge/AlertBadge';
import { DashboardChartCard } from '../../../components/DashboardCharts';
import { ActiveFilterChips } from '../../../components/ActiveFilterChips/ActiveFilterChips';
import { useHistoryHasActiveFilters, useQuestionnaireHistoryV2 } from '../../../hooks/questionnaires/useQuestionnaireHistoryV2';
import {
    addQuestionnaireHistoryTagV2,
    deleteQuestionnaireHistoryTagV2,
    downloadQuestionnaireHistoryPdfV2,
    generateQuestionnaireHistoryPdfV2,
    getGuardianDashboardV2,
    getPsychologistDashboardV2,
    getQuestionnaireCaseDetailV2,
    getQuestionnaireCasesV2,
    getQuestionnaireClinicalSummaryV2,
    getQuestionnaireHistoryDetailV2,
    getQuestionnaireHistoryPdfV2,
    getQuestionnaireHistoryResultsV2,
    shareQuestionnaireHistoryV2
} from '../../../services/questionnaires/questionnaires.api';
import type {
    QuestionnaireCaseDetailV2Response,
    QuestionnaireCaseV2DTO,
    QuestionnaireClinicalSummaryV2DTO,
    QuestionnaireDashboardChartPointDTO,
    QuestionnaireGuardianDashboardV2Response,
    QuestionnaireHistoryFiltersV2,
    QuestionnaireHistoryItemV2DTO,
    QuestionnairePdfInfoV2DTO,
    QuestionnairePsychologistDashboardV2Response,
    QuestionnaireSecureResultsV2DTO,
    QuestionnaireShareResponseDTO,
    QuestionnaireTagDTO,
    QuestionnaireTagVisibility
} from '../../../services/questionnaires/questionnaires.types';
import {
    buildClinicalSummarySections,
    getClinicalComorbiditySummary,
    getRiskLevelPresentation,
    getSafeClinicalDisclaimer
} from '../../../services/questionnaires/clinicalSummary';
import {
    buildSafeDisplayRows,
    formatDateTimeEsCO,
    getDomainLabel,
    getModeLabel,
    getRoleLabel,
    getStatusLabel,
    mapApiErrorToUserMessage
} from '../../../utils/presentation/naturalLanguage';
import { buildActiveFilterChips, buildHistoryKpis, normalizeChartSeries } from '../../../utils/questionnaires/dashboardTransform';
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
const domainOptions = [{ value: '', label: 'Todos' }, { value: 'adhd', label: 'TDAH' }, { value: 'conduct', label: 'Conducta' }, { value: 'anxiety', label: 'Ansiedad' }, { value: 'depression', label: 'Depresion' }, { value: 'elimination', label: 'Eliminacion' }];
const alertOptions = [{ value: '', label: 'Todas' }, { value: 'low', label: 'Baja' }, { value: 'moderate', label: 'Moderada' }, { value: 'elevated', label: 'Elevada' }, { value: 'high', label: 'Alta' }, { value: 'critical_review', label: 'Revision prioritaria' }];
const reviewOptions = [{ value: '', label: 'Todos' }, { value: 'true', label: 'Requiere revision' }, { value: 'false', label: 'Sin revision requerida' }];
const periodOptions = [{ value: '3', label: '3 meses' }, { value: '6', label: '6 meses' }, { value: '12', label: '12 meses' }];
const tagVisibilityOptions = [{ value: 'private', label: 'Privado' }, { value: 'shared', label: 'Compartido' }];
const tagColorOptions = [{ value: '#215f8f', label: 'Azul' }, { value: '#1f7a46', label: 'Verde' }, { value: '#d97a1f', label: 'Naranja' }, { value: '#5f2a8f', label: 'Morado' }, { value: '#bd1f2d', label: 'Rojo' }];
const defaultTagColor = tagColorOptions[0].value;

function toRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}
function getString(value: unknown, fallback = '--') {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}
function resolveTagId(tag: QuestionnaireTagDTO) {
    if (typeof tag.id === 'string' && tag.id.trim()) return tag.id;
    if (typeof tag.tag_id === 'string' && tag.tag_id.trim()) return tag.tag_id;
    return '';
}
function toChartData(points: QuestionnaireDashboardChartPointDTO[] | null | undefined) {
    return normalizeChartSeries(points).map((item) => ({ id: item.id, label: item.label, value: item.value, tone: item.tone }));
}
function defaultFilters(): QuestionnaireHistoryFiltersV2 {
    return { status: '', q: '', case_label: '', case_public_id: '', tag: '', domain: '', alert_level: '', date_from: '', date_to: '', needs_professional_review: undefined };
}
function toMaybeBoolean(value: string) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
}
function canLoadClinicalArtifacts(status: string | null | undefined) {
    const normalized = (status ?? '').trim().toLowerCase();
    return normalized === 'submitted' || normalized === 'processed';
}
function makeTitle(role: HistorialRole) {
    return role === 'padre' ? 'Seguimiento por casos' : 'Evaluaciones recibidas e historial';
}
function makeDescription(role: HistorialRole) {
    return role === 'padre'
        ? 'Consulta la evolucion de alertas orientativas por caso y dominio.'
        : 'Visualiza evaluaciones compartidas, alertas y estado de revision.';
}
async function loadDetail(sessionId: string) {
    const detail = await getQuestionnaireHistoryDetailV2(sessionId);
    if (!canLoadClinicalArtifacts(detail.status)) return { detail, results: null, summary: null };
    const [results, summary] = await Promise.allSettled([getQuestionnaireHistoryResultsV2(sessionId), getQuestionnaireClinicalSummaryV2(sessionId)]);
    return {
        detail,
        results: results.status === 'fulfilled' ? results.value : null,
        summary: summary.status === 'fulfilled' ? summary.value : null
    };
}
function KeyValueRows({ data, hidden = [], emptyText }: Readonly<{ data: Record<string, unknown> | null; hidden?: string[]; emptyText: string }>) {
    const rows = buildSafeDisplayRows(data, { includeTechnical: false, includeEmpty: false, hiddenFields: hidden });
    if (rows.length === 0) return <p className="historial-dashboard-helper">{emptyText}</p>;
    return <div className="historial-dashboard-kv-grid">{rows.map((row) => <div key={row.key}><strong>{row.label}</strong><span>{row.value}</span></div>)}</div>;
}
function resolveCaseLabel(caseItem: QuestionnaireCaseV2DTO) {
    return caseItem.display_label ?? caseItem.private_label ?? caseItem.case_public_id ?? caseItem.case_id;
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

    const [guardianDashboard, setGuardianDashboard] = useState<QuestionnaireGuardianDashboardV2Response | null>(null);
    const [guardianCases, setGuardianCases] = useState<QuestionnaireCaseV2DTO[]>([]);
    const [guardianError, setGuardianError] = useState<string | null>(null);
    const [guardianLoading, setGuardianLoading] = useState(role === 'padre');

    const [psychologistDashboard, setPsychologistDashboard] = useState<QuestionnairePsychologistDashboardV2Response | null>(null);
    const [psychologistError, setPsychologistError] = useState<string | null>(null);
    const [psychologistLoading, setPsychologistLoading] = useState(role === 'psicologo');

    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const [selectedCaseDetail, setSelectedCaseDetail] = useState<QuestionnaireCaseDetailV2Response | null>(null);
    const [caseDetailLoading, setCaseDetailLoading] = useState(false);

    const [detailSessionId, setDetailSessionId] = useState<string | null>(null);
    const [detailPayload, setDetailPayload] = useState<QuestionnaireHistoryItemV2DTO | null>(null);
    const [resultsPayload, setResultsPayload] = useState<QuestionnaireSecureResultsV2DTO | null>(null);
    const [clinicalSummaryPayload, setClinicalSummaryPayload] = useState<QuestionnaireClinicalSummaryV2DTO | null>(null);
    const [pdfPayload, setPdfPayload] = useState<QuestionnairePdfInfoV2DTO | null>(null);
    const [sharePayload, setSharePayload] = useState<QuestionnaireShareResponseDTO | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [detailNotice, setDetailNotice] = useState<string | null>(null);

    const [newTag, setNewTag] = useState('');
    const [newTagColor, setNewTagColor] = useState(defaultTagColor);
    const [newTagVisibility, setNewTagVisibility] = useState<QuestionnaireTagVisibility>('private');
    const [shareExpiresHours, setShareExpiresHours] = useState('24');
    const [shareMaxUses, setShareMaxUses] = useState('');
    const [shareGranteeUserId, setShareGranteeUserId] = useState('');
    const [shareUrl, setShareUrl] = useState<string | null>(null);

    const hasActiveFilters = useHistoryHasActiveFilters(history.filters);
    const filterChips = useMemo(() => buildActiveFilterChips(history.filters), [history.filters]);
    const kpis = useMemo(() => buildHistoryKpis(history.items, history.summary, history.total), [history.items, history.summary, history.total]);
    const tags = useMemo(() => detailPayload?.tags ?? [], [detailPayload]);
    const clinicalSections = useMemo(() => buildClinicalSummarySections(clinicalSummaryPayload), [clinicalSummaryPayload]);
    const clinicalRisk = useMemo(() => getRiskLevelPresentation(clinicalSummaryPayload?.overall_risk_level ?? null), [clinicalSummaryPayload?.overall_risk_level]);
    const clinicalDisclaimer = useMemo(() => getSafeClinicalDisclaimer(clinicalSummaryPayload), [clinicalSummaryPayload]);
    const clinicalComorbiditySummary = useMemo(() => getClinicalComorbiditySummary(clinicalSummaryPayload), [clinicalSummaryPayload]);
    const isPdfReady = useMemo(() => ['ready', 'completed', 'generated', 'available', 'done'].includes(String(pdfPayload?.status ?? '').toLowerCase()), [pdfPayload?.status]);

    useEffect(() => {
        setDraftFilters((previous) => ({ ...previous, ...history.filters }));
    }, [history.filters]);

    useEffect(() => {
        if (role !== 'padre') return;
        const loadGuardian = async () => {
            setGuardianLoading(true);
            setGuardianError(null);
            try {
                const [dashboard, cases] = await Promise.all([
                    getGuardianDashboardV2({
                        months: Number(period),
                        case_label: history.filters.case_label,
                        case_public_id: history.filters.case_public_id,
                        q: history.filters.q,
                        domain: history.filters.domain,
                        alert_level: history.filters.alert_level,
                        date_from: history.filters.date_from,
                        date_to: history.filters.date_to
                    }),
                    getQuestionnaireCasesV2({
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
                ]);
                setGuardianDashboard(dashboard);
                setGuardianCases(cases.items);
            } catch (error) {
                setGuardianError(mapApiErrorToUserMessage(error, 'No fue posible cargar el dashboard de seguimiento.'));
            } finally {
                setGuardianLoading(false);
            }
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

    const applyFilters = () => history.patchFilters({ ...draftFilters, page: 1, page_size: history.pageSize });
    const clearFilters = () => {
        const cleaned = defaultFilters();
        setDraftFilters(cleaned);
        history.resetFilters();
    };
    const removeFilterChip = (key: string) => {
        history.patchFilters({ [key]: undefined, page: 1 } as Partial<QuestionnaireHistoryFiltersV2>);
        setDraftFilters((previous) => {
            const next = { ...previous } as Record<string, unknown>;
            next[key] = '';
            return next as QuestionnaireHistoryFiltersV2;
        });
    };

    const openDetail = async (sessionId: string) => {
        setDetailSessionId(sessionId);
        setDetailLoading(true);
        setDetailError(null);
        setDetailNotice(null);
        setSharePayload(null);
        setPdfPayload(null);
        try {
            const detail = await loadDetail(sessionId);
            setDetailPayload(detail.detail);
            setResultsPayload(detail.results);
            setClinicalSummaryPayload(detail.summary);
        } catch (error) {
            setDetailError(mapApiErrorToUserMessage(error, 'No fue posible cargar el detalle.'));
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetail = () => {
        setDetailSessionId(null);
        setDetailPayload(null);
        setResultsPayload(null);
        setClinicalSummaryPayload(null);
        setSharePayload(null);
        setPdfPayload(null);
        setShareUrl(null);
        setDetailError(null);
        setDetailNotice(null);
        setNewTag('');
        setShareExpiresHours('24');
        setShareMaxUses('');
        setShareGranteeUserId('');
    };

    const addTag = async () => {
        if (!detailSessionId || !newTag.trim()) return;
        try {
            await addQuestionnaireHistoryTagV2(detailSessionId, { tag: newTag.trim(), color: newTagColor, visibility: newTagVisibility });
            setDetailPayload(await getQuestionnaireHistoryDetailV2(detailSessionId));
            setNewTag('');
            setDetailNotice('Etiqueta agregada.');
            await history.reload();
        } catch (error) {
            setDetailError(mapApiErrorToUserMessage(error, 'No fue posible agregar etiqueta.'));
        }
    };
    const deleteTag = async (tagId: string) => {
        if (!detailSessionId) return;
        try {
            await deleteQuestionnaireHistoryTagV2(detailSessionId, tagId);
            setDetailPayload(await getQuestionnaireHistoryDetailV2(detailSessionId));
            setDetailNotice('Etiqueta eliminada.');
            await history.reload();
        } catch (error) {
            setDetailError(mapApiErrorToUserMessage(error, 'No fue posible eliminar etiqueta.'));
        }
    };
    const generateShare = async () => {
        if (!detailSessionId) return;
        try {
            const payload = await shareQuestionnaireHistoryV2(detailSessionId, {
                expires_in_hours: Number(shareExpiresHours) > 0 ? Number(shareExpiresHours) : undefined,
                max_uses: Number(shareMaxUses) > 0 ? Number(shareMaxUses) : undefined,
                grantee_user_id: shareGranteeUserId.trim() || undefined
            });
            const nextUrl = payload.shared_url ?? payload.shared_path ?? null;
            setSharePayload(payload);
            setShareUrl(nextUrl);
            setDetailNotice(nextUrl ? 'Enlace generado.' : 'Se genero enlace sin URL publica.');
        } catch (error) {
            setDetailError(mapApiErrorToUserMessage(error, 'No fue posible generar enlace.'));
        }
    };
    const generatePdf = async () => {
        if (!detailSessionId) return;
        try {
            await generateQuestionnaireHistoryPdfV2(detailSessionId);
            setPdfPayload(await getQuestionnaireHistoryPdfV2(detailSessionId));
        } catch (error) {
            setDetailError(mapApiErrorToUserMessage(error, 'No fue posible generar PDF.'));
        }
    };
    const fetchPdf = async () => {
        if (!detailSessionId) return;
        try {
            setPdfPayload(await getQuestionnaireHistoryPdfV2(detailSessionId));
        } catch (error) {
            setDetailError(mapApiErrorToUserMessage(error, 'No fue posible consultar PDF.'));
        }
    };
    const downloadPdf = async () => {
        if (!detailSessionId) return;
        try {
            const file = await downloadQuestionnaireHistoryPdfV2(detailSessionId);
            const href = URL.createObjectURL(file.blob);
            const anchor = document.createElement('a');
            anchor.href = href;
            anchor.download = file.filename;
            anchor.click();
            URL.revokeObjectURL(href);
        } catch (error) {
            setDetailError(mapApiErrorToUserMessage(error, 'No fue posible descargar PDF.'));
        }
    };

    const historyCharts = {
        byDate: toChartData(history.charts?.alerts_by_date ?? history.charts?.sessions_by_month),
        byCase: toChartData(history.charts?.history_by_case ?? history.charts?.sessions_by_case),
        byDomain: toChartData(history.charts?.alerts_by_domain),
        byLevel: toChartData(history.charts?.alerts_by_level)
    };
    const guardianCharts = {
        byMonth: toChartData(guardianDashboard?.charts?.alerts_by_month),
        byDomain: toChartData(guardianDashboard?.charts?.alerts_by_domain),
        byCase: toChartData(guardianDashboard?.charts?.sessions_by_case),
        byAlert: toChartData(guardianDashboard?.charts?.cases_by_alert_level)
    };
    const psychologistCharts = {
        byDomain: toChartData(psychologistDashboard?.charts?.alerts_by_domain ?? psychologistDashboard?.aggregates?.by_domain),
        byLevel: toChartData(psychologistDashboard?.charts?.alerts_by_level ?? psychologistDashboard?.aggregates?.by_alert_level),
        byStatus: toChartData(psychologistDashboard?.charts?.reviews_by_status ?? psychologistDashboard?.aggregates?.by_review_status),
        byDate: toChartData(psychologistDashboard?.charts?.alerts_by_date ?? psychologistDashboard?.aggregates?.by_date)
    };

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

                <section className="historial-dashboard-filters">
                    <div className="historial-dashboard-filters-grid">
                        <label>Estado<CustomSelect value={draftFilters.status ?? ''} options={statusOptions} onChange={(value) => setDraftFilters((prev) => ({ ...prev, status: value }))} ariaLabel="Filtrar por estado" /></label>
                        <label>Caso/etiqueta<input type="text" value={draftFilters.case_label ?? ''} onChange={(event) => setDraftFilters((prev) => ({ ...prev, case_label: event.target.value }))} /></label>
                        <label>Caso publico<input type="text" value={draftFilters.case_public_id ?? ''} onChange={(event) => setDraftFilters((prev) => ({ ...prev, case_public_id: event.target.value }))} /></label>
                        <label>Tag<input type="text" value={draftFilters.tag ?? ''} onChange={(event) => setDraftFilters((prev) => ({ ...prev, tag: event.target.value }))} /></label>
                        <label>Dominio<CustomSelect value={draftFilters.domain ?? ''} options={domainOptions} onChange={(value) => setDraftFilters((prev) => ({ ...prev, domain: value }))} ariaLabel="Filtrar por dominio" /></label>
                        <label>Alerta<CustomSelect value={draftFilters.alert_level ?? ''} options={alertOptions} onChange={(value) => setDraftFilters((prev) => ({ ...prev, alert_level: value }))} ariaLabel="Filtrar por alerta" /></label>
                        <label>Desde<input type="date" value={draftFilters.date_from ?? ''} onChange={(event) => setDraftFilters((prev) => ({ ...prev, date_from: event.target.value }))} /></label>
                        <label>Hasta<input type="date" value={draftFilters.date_to ?? ''} onChange={(event) => setDraftFilters((prev) => ({ ...prev, date_to: event.target.value }))} /></label>
                        <label>Buscar<input type="text" value={draftFilters.q ?? ''} onChange={(event) => setDraftFilters((prev) => ({ ...prev, q: event.target.value }))} /></label>
                        <label>Revision<CustomSelect value={draftFilters.needs_professional_review === undefined ? '' : String(draftFilters.needs_professional_review)} options={reviewOptions} onChange={(value) => setDraftFilters((prev) => ({ ...prev, needs_professional_review: toMaybeBoolean(value) }))} ariaLabel="Filtrar por revision profesional" /></label>
                        {role === 'padre' ? <label>Periodo<CustomSelect value={period} options={periodOptions} onChange={setPeriod} ariaLabel="Periodo" /></label> : null}
                    </div>
                    <div className="historial-dashboard-filter-actions">
                        <button type="button" className="historial-dashboard-btn" onClick={applyFilters}>Aplicar filtros</button>
                        <button type="button" className="historial-dashboard-btn secondary" onClick={clearFilters}>Resetear</button>
                    </div>
                    <ActiveFilterChips chips={filterChips} onRemove={removeFilterChip} />
                </section>

                <section className="historial-dashboard-kpis">
                    <article className="historial-dashboard-kpi-card"><span>Total registros</span><strong>{kpis.total}</strong></article>
                    <article className="historial-dashboard-kpi-card"><span>Procesados</span><strong>{kpis.processed}</strong></article>
                    <article className="historial-dashboard-kpi-card"><span>Con alerta</span><strong>{kpis.withAlert}</strong></article>
                    <article className="historial-dashboard-kpi-card"><span>Requieren revision</span><strong>{kpis.needsReview}</strong></article>
                    <article className="historial-dashboard-kpi-card"><span>Sin caso asociado</span><strong>{kpis.withoutCase}</strong></article>
                    <article className="historial-dashboard-kpi-card">
                        <span>{role === 'padre' ? 'Casos con alerta' : 'Casos visibles'}</span>
                        <strong>{role === 'padre' ? summaryNumber(guardianDashboard?.summary, ['cases_with_alerts', 'cases_alerts']) : summaryNumber(psychologistDashboard?.summary, ['cases_visible', 'total_cases'])}</strong>
                    </article>
                </section>

                <section className="historial-dashboard-charts">
                    <DashboardChartCard title="Historico por fecha" data={historyCharts.byDate} loading={history.loading} variant="line" />
                    <DashboardChartCard title="Historial por caso" data={historyCharts.byCase} loading={history.loading} />
                    <DashboardChartCard title="Alertas por dominio" data={historyCharts.byDomain} loading={history.loading} />
                    <DashboardChartCard title="Alertas por nivel" data={historyCharts.byLevel} loading={history.loading} />
                </section>

                {role === 'padre' ? (
                    <section className="historial-dashboard-role-block">
                        {guardianError ? <div className="historial-dashboard-alert error">{guardianError}</div> : null}
                        <div className="historial-dashboard-charts">
                            <DashboardChartCard title="Alertas por mes" data={guardianCharts.byMonth} loading={guardianLoading} variant="line" />
                            <DashboardChartCard title="Alertas por dominio" data={guardianCharts.byDomain} loading={guardianLoading} />
                            <DashboardChartCard title="Sesiones por caso" data={guardianCharts.byCase} loading={guardianLoading} />
                            <DashboardChartCard title="Casos por alerta" data={guardianCharts.byAlert} loading={guardianLoading} />
                        </div>
                        <div className="historial-dashboard-cases-grid">
                            {guardianCases.map((caseItem) => (
                                <article className="historial-dashboard-case-card" key={caseItem.case_id}>
                                    <h3>{resolveCaseLabel(caseItem)}</h3>
                                    <div><strong>ID publico:</strong> {getString(caseItem.case_public_id)}</div>
                                    <div><strong>Sesiones:</strong> {caseItem.sessions_count ?? 0}</div>
                                    <div><strong>Procesadas:</strong> {caseItem.processed_sessions_count ?? 0}</div>
                                    <div className="historial-dashboard-card-inline"><strong>Ultima alerta:</strong> <AlertBadge level={caseItem.latest_alert_level} /></div>
                                    <div><strong>Dominio:</strong> {getDomainLabel(caseItem.latest_domain)}</div>
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
                                                    <div className="historial-dashboard-card-inline"><strong>{item.case_display_label ?? item.case_public_id ?? item.id}</strong><AlertBadge level={item.latest_alert_level} /></div>
                                                    <div><strong>Estado:</strong> {getStatusLabel(item.status)}</div>
                                                    <div><strong>Dominio:</strong> {getDomainLabel(item.dominant_domain)}</div>
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
                            <DashboardChartCard title="Alertas por nivel" data={psychologistCharts.byLevel} loading={psychologistLoading} />
                            <DashboardChartCard title="Revisiones por estado" data={psychologistCharts.byStatus} loading={psychologistLoading} />
                            <DashboardChartCard title="Alertas por fecha" data={psychologistCharts.byDate} loading={psychologistLoading} variant="line" />
                        </div>
                    </section>
                )}

                <section className="historial-dashboard-list">
                    <div className="historial-dashboard-list-header"><h2>Listado detallado</h2><div>Mostrando {showFrom}-{showTo} de {history.total}</div></div>
                    {history.error ? <div className="historial-dashboard-alert error">{history.error}</div> : null}
                    {history.loading ? <div className="historial-dashboard-empty">Cargando registros...</div> : null}
                    {!history.loading && history.items.length === 0 ? <div className="historial-dashboard-empty">{hasActiveFilters ? 'No hay resultados para los filtros aplicados.' : 'Aun no hay sesiones registradas.'}</div> : null}
                    <div className="historial-dashboard-session-list">
                        {history.items.map((item) => (
                            <article className="historial-dashboard-session-card" key={item.id}>
                                <div className="historial-dashboard-card-inline"><strong>{item.case_display_label ?? item.case_public_id ?? item.title ?? item.id}</strong><AlertBadge level={item.latest_alert_level} /></div>
                                <div><strong>Estado:</strong> {getStatusLabel(item.status)}</div>
                                <div><strong>Modo:</strong> {getModeLabel(item.mode)}</div>
                                <div><strong>Rol:</strong> {getRoleLabel(item.role)}</div>
                                <div><strong>Dominio:</strong> {getDomainLabel(item.dominant_domain)}</div>
                                <div><strong>Creado:</strong> {formatDateTimeEsCO(item.created_at)}</div>
                                <button type="button" className="historial-dashboard-btn" onClick={() => openDetail(item.id).catch(() => undefined)}>Ver detalle</button>
                            </article>
                        ))}
                    </div>
                    <div className="historial-dashboard-pagination">
                        <label>Tamano<CustomSelect value={String(history.pageSize)} options={pageSizeOptions} onChange={(value) => history.changePageSize(Number(value))} ariaLabel="Cambiar tamano de pagina" /></label>
                        <button type="button" className="historial-dashboard-btn secondary" onClick={() => history.setPage(Math.max(1, history.page - 1))} disabled={history.page <= 1}>Anterior</button>
                        <span>Pagina {history.page} de {Math.max(1, history.pages)}</span>
                        <button type="button" className="historial-dashboard-btn secondary" onClick={() => history.setPage(Math.min(Math.max(1, history.pages), history.page + 1))} disabled={history.page >= Math.max(1, history.pages)}>Siguiente</button>
                    </div>
                </section>
            </section>

            <Modal isOpen={detailSessionId !== null} onClose={closeDetail}>
                <div className="historial-dashboard-modal">
                    <h2>Detalle de sesion</h2>
                    {detailLoading ? <div className="historial-dashboard-empty">Cargando detalle...</div> : null}
                    {detailError ? <div className="historial-dashboard-alert error">{detailError}</div> : null}
                    {detailNotice ? <div className="historial-dashboard-alert success">{detailNotice}</div> : null}
                    {!detailLoading && detailPayload ? (
                        <>
                            <div className="historial-dashboard-kv-grid">
                                <div><strong>Estado</strong><span>{getStatusLabel(detailPayload.status)}</span></div>
                                <div><strong>Modo</strong><span>{getModeLabel(detailPayload.mode)}</span></div>
                                <div><strong>Rol</strong><span>{getRoleLabel(detailPayload.role)}</span></div>
                                <div><strong>Actualizado</strong><span>{formatDateTimeEsCO(detailPayload.updated_at)}</span></div>
                            </div>
                            <div className="historial-dashboard-warning">Este resultado es orientativo y no constituye diagnostico clinico definitivo.</div>
                            <div className="historial-dashboard-modal-section">
                                <h3>Informe orientativo</h3>
                                {clinicalSummaryPayload ? (
                                    <>
                                        <div className="historial-dashboard-kv-grid">
                                            <div><strong>Nivel de alerta</strong><span>{clinicalRisk.label}</span></div>
                                            <div><strong>Generado</strong><span>{formatDateTimeEsCO(clinicalSummaryPayload.generated_at)}</span></div>
                                        </div>
                                        {clinicalComorbiditySummary ? <div className="historial-dashboard-warning"><strong>Posible coexistencia de senales.</strong> {clinicalComorbiditySummary}</div> : null}
                                        <div className="historial-dashboard-kv-grid">{clinicalSections.map((section) => <div key={section.key}><strong>{section.title}</strong><span>{section.content}</span></div>)}</div>
                                    </>
                                ) : <p className="historial-dashboard-helper">No hay informe orientativo disponible.</p>}
                            </div>
                            <div className="historial-dashboard-modal-section">
                                <h3>Resultados estructurados</h3>
                                <KeyValueRows data={toRecord(resultsPayload?.result ?? resultsPayload)} hidden={['id', 'session_id', 'questionnaire_id', 'metadata']} emptyText="Sin resultados complementarios." />
                                <p className="historial-dashboard-helper">{clinicalDisclaimer}</p>
                            </div>
                            <div className="historial-dashboard-modal-section">
                                <h3>Etiquetas</h3>
                                {tags.length === 0 ? <p className="historial-dashboard-helper">Sin etiquetas.</p> : (
                                    <div className="historial-dashboard-tags">{tags.map((tag, index) => {
                                        if (typeof tag === 'string') return <div className="historial-dashboard-tag" key={`${tag}-${index}`}><span>{tag}</span></div>;
                                        const tagId = resolveTagId(tag);
                                        return <div className="historial-dashboard-tag" key={tagId || `${tag.label}-${index}`} style={{ borderLeftColor: tag.color ?? defaultTagColor }}><span>{tag.label}</span>{tagId ? <button type="button" onClick={() => deleteTag(tagId).catch(() => undefined)}>Eliminar</button> : null}</div>;
                                    })}</div>
                                )}
                                <div className="historial-dashboard-tag-form">
                                    <input type="text" value={newTag} onChange={(event) => setNewTag(event.target.value)} placeholder="Nueva etiqueta" />
                                    <CustomSelect value={newTagVisibility} options={tagVisibilityOptions} onChange={(value) => setNewTagVisibility(value as QuestionnaireTagVisibility)} ariaLabel="Visibilidad de etiqueta" />
                                    <div className="historial-dashboard-colors" role="radiogroup" aria-label="Color de etiqueta">{tagColorOptions.map((option) => <button key={option.value} type="button" className={`historial-dashboard-color ${newTagColor === option.value ? 'is-selected' : ''}`} role="radio" aria-checked={newTagColor === option.value} style={{ backgroundColor: option.value }} onClick={() => setNewTagColor(option.value)} />)}</div>
                                    <button type="button" className="historial-dashboard-btn" onClick={() => addTag().catch(() => undefined)}>Agregar</button>
                                </div>
                            </div>
                            <div className="historial-dashboard-modal-section">
                                <h3>Compartir y PDF</h3>
                                <div className="historial-dashboard-actions-grid">
                                    <article>
                                        <h4>Compartir</h4>
                                        <div className="historial-dashboard-share-form">
                                            <input type="number" min={1} value={shareExpiresHours} onChange={(event) => setShareExpiresHours(event.target.value)} placeholder="Expira en horas" />
                                            <input type="number" min={1} value={shareMaxUses} onChange={(event) => setShareMaxUses(event.target.value)} placeholder="Max usos" />
                                            <input type="text" value={shareGranteeUserId} onChange={(event) => setShareGranteeUserId(event.target.value)} placeholder="ID destinatario" />
                                        </div>
                                        <button type="button" className="historial-dashboard-btn" onClick={() => generateShare().catch(() => undefined)}>Generar enlace</button>
                                        {(shareUrl ?? sharePayload?.shared_url ?? sharePayload?.shared_path) ? <a href={shareUrl ?? sharePayload?.shared_url ?? sharePayload?.shared_path ?? undefined} target="_blank" rel="noreferrer">{shareUrl ?? sharePayload?.shared_url ?? sharePayload?.shared_path}</a> : <p className="historial-dashboard-helper">Aun no hay enlace compartido.</p>}
                                    </article>
                                    <article>
                                        <h4>PDF</h4>
                                        <p className="historial-dashboard-helper">Estado: {getString(pdfPayload?.status, 'Sin generar')}</p>
                                        <div className="historial-dashboard-inline-actions">
                                            <button type="button" className="historial-dashboard-btn" onClick={() => generatePdf().catch(() => undefined)}>Generar PDF</button>
                                            <button type="button" className="historial-dashboard-btn secondary" onClick={() => fetchPdf().catch(() => undefined)}>Consultar estado</button>
                                            <button type="button" className="historial-dashboard-btn" onClick={() => downloadPdf().catch(() => undefined)} disabled={!isPdfReady}>Descargar</button>
                                        </div>
                                        <KeyValueRows data={toRecord(pdfPayload)} hidden={['download_url', 'file_id', 'mime_type']} emptyText="Sin metadatos adicionales del PDF." />
                                    </article>
                                </div>
                            </div>
                        </>
                    ) : null}
                    <div className="historial-dashboard-modal-actions"><button type="button" className="historial-dashboard-btn secondary" onClick={closeDetail}>Cerrar</button></div>
                </div>
            </Modal>
        </div>
    );
}
