import { useEffect, useMemo, useState } from 'react';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { AlertBadge } from '../../../components/AlertBadge/AlertBadge';
import { DashboardChartCard } from '../../../components/DashboardCharts';
import type { DashboardChartItem } from '../../../components/DashboardCharts';
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
    QuestionnaireDashboardChartSourceDTO,
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
import { findFirstVisibleProfessionalReview, normalizeReviewStatus } from '../../../utils/questionnaires/presentation';
import { buildActiveFilterChips, buildHistoryKpis, normalizeChartSeries } from '../../../utils/questionnaires/dashboardTransform';
import { getChartSource } from '../../../utils/questionnaires/chartContract';
import {
    getDashboardDomainLabel,
    resolveCaseCompositeLabel,
    toHistoryStatusFilter,
    toOptionalFilterText
} from '../../../utils/questionnaires/dashboardLabels';
import './HistorialBase.css';

const DOMAIN_EVOLUTION_LABELS: Record<string, string> = {
    adhd: 'TDAH',
    anxiety: 'Ansiedad',
    conduct: 'Conducta',
    depression: 'Depresión',
    elimination: 'Eliminación'
};

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
function toChartData(points: QuestionnaireDashboardChartSourceDTO | null | undefined) {
    return normalizeChartSeries(points).map((item) => ({ id: item.id, label: item.label, value: item.value, tone: item.tone }));
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
function resolveHistoryItemReviewStatus(item: QuestionnaireHistoryItemV2DTO) {
    const review = findFirstVisibleProfessionalReview(item);
    if (review) return normalizeReviewStatus(review.rawReviewStatus);

    const record = item as Record<string, unknown>;
    if (record.review_status) {
        return normalizeReviewStatus(record.review_status);
    }
    return null;
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
    const kpis = useMemo(() => buildHistoryKpis(history.summary, history.total), [history.summary, history.total]);

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
    const MONTHS_ES = [
        'ene', 'feb', 'mar', 'abr', 'may', 'jun',
        'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
    ];
    function formatMonthPeriod(value?: string | null) {
        if (!value) return '';
        const match = /^(\d{4})-(\d{2})$/.exec(value);
        if (!match) return value;
        const year = Number(match[1]);
        const monthIndex = Number(match[2]) - 1;
        if (!Number.isFinite(year) || monthIndex < 0 || monthIndex > 11) return value;
        return `${MONTHS_ES[monthIndex]} ${year}`;
    }

    function chartItems(source: unknown): unknown[] {
        if (!source) return [];
        if (Array.isArray(source)) return source as unknown[];
        if (typeof source === 'object' && source !== null) {
            const rec = source as Record<string, unknown>;
            if (Array.isArray(rec.items)) return rec.items as unknown[];
        }
        return [];
    }

    // --- Selected case mappers (generic, backend-first, preserve zeros) ---
    function buildSelectedCaseDomainSummary(detail: unknown) {
        const rec = detail as Record<string, unknown> | undefined;
        const charts = rec?.charts && typeof rec.charts === 'object' ? (rec.charts as Record<string, unknown>) : undefined;
        const candidate = charts ? charts['domain_summary'] : undefined;
        let sourceArray: unknown[] | null = null;
        if (Array.isArray(candidate)) sourceArray = candidate;
        else if (candidate && typeof candidate === 'object' && Array.isArray((candidate as Record<string, unknown>).items)) sourceArray = (candidate as Record<string, unknown>).items as unknown[];
        const fallback = Array.isArray(rec?.domain_summary) ? rec?.domain_summary as unknown[] : null;
        const itemsSource = Array.isArray(sourceArray) ? sourceArray : Array.isArray(fallback) ? fallback : [];
        if (!Array.isArray(itemsSource)) return null;
        const items = itemsSource.map((it: unknown, idx: number) => {
            const row = it as Record<string, unknown>;
            const latestPercentage = row['latest_percentage'] !== null && row['latest_percentage'] !== undefined
                ? Number(row['latest_percentage'])
                : Number(((Number(row['latest_probability'] ?? 0) * 100) || 0).toFixed(1));
            const maxPercentage = row['max_percentage'] !== null && row['max_percentage'] !== undefined
                ? Number(row['max_percentage'])
                : Number(((Number(row['max_probability'] ?? 0) * 100) || 0).toFixed(1));
            return {
                id: String(row['domain_code'] ?? row['domain'] ?? row['code'] ?? `domain-${idx}`),
                key: row['domain_code'] ?? row['domain'] ?? row['code'] ?? `domain-${idx}`,
                label: row['domain_label'] ?? row['label'] ?? row['domain'] ?? row['code'] ?? `Dominio ${idx + 1}`,
                value: Number(latestPercentage),
                max_value: Number(maxPercentage),
                latest_percentage: Number(latestPercentage),
                max_percentage: Number(maxPercentage),
                alert_level: row['latest_alert_level'] ?? row['alert_level'],
                alert_label: row['latest_alert_label'] ?? row['alert_label'],
                sessions_with_alert: Number(row['sessions_with_alert'] ?? 0),
                raw: row
            } as Record<string, unknown>;
        });
        return { items } as unknown as QuestionnaireDashboardChartSourceDTO;
    }

    function buildSelectedCaseAggregateTrend(detail: unknown) {
        const rec = detail as Record<string, unknown> | undefined;
        const charts = rec?.charts && typeof rec.charts === 'object' ? (rec.charts as Record<string, unknown>) : undefined;
        const candidate = charts ? charts['trend'] : undefined;
        let trendArray: unknown[] | null = null;
        if (Array.isArray(candidate)) trendArray = candidate;
        else if (candidate && typeof candidate === 'object' && Array.isArray((candidate as Record<string, unknown>).items)) trendArray = (candidate as Record<string, unknown>).items as unknown[];
        const itemsSource = Array.isArray(trendArray) ? trendArray : [];
        if (!Array.isArray(itemsSource)) return null;
        const items = (itemsSource as Record<string, unknown>[])
            .filter((p) => p.percentage !== null && p.percentage !== undefined)
            .map((p, idx) => ({
                id: String(p.session_id ?? p.id ?? `point-${idx}`),
                label: p.label ?? p.date ?? p.session_id ?? `P${idx + 1}`,
                value: Number(p.percentage),
                date: p.date,
                session_id: p.session_id,
                alert_level: p.alert_level,
                alert_label: p.alert_label,
                processed_at: p.processed_at,
                raw: p
            }));
        return { items } as unknown as QuestionnaireDashboardChartSourceDTO;
    }

    function buildSelectedCaseDomainEvolution(detail: unknown) {
        const rec = detail as Record<string, unknown> | undefined;
        if (!rec || !Array.isArray(rec.trend)) return null;
        const source = rec.trend as unknown[];
        const items = source
            .filter((pt) => pt && typeof pt === 'object' && Array.isArray((pt as Record<string, unknown>).domains) && ((pt as Record<string, unknown>).domains as unknown[]).length > 0)
            .map((pt, idx) => {
                const point = pt as Record<string, unknown>;
                const values: Record<string, unknown> = {};
                const domains = Array.isArray(point.domains) ? point.domains as unknown[] : [];
                for (const domainItem of domains) {
                    if (!domainItem || typeof domainItem !== 'object') continue;
                    const domainRec = domainItem as Record<string, unknown>;
                    const code = String(domainRec.domain ?? domainRec.domain_code ?? domainRec.code ?? '').trim();
                    if (!code) continue;
                    const rawProbability = Number(domainRec.probability ?? 0);
                    const pct = Number((rawProbability * 100).toFixed(1));
                    values[code] = pct;
                    if (domainRec.alert_level !== undefined && domainRec.alert_level !== null) {
                        values[`${code}_alert_level`] = String(domainRec.alert_level);
                    }
                }
                return {
                    id: String(point.session_id ?? point.id ?? `evo-${idx}`),
                    label: String(point.label ?? point.date ?? point.session_id ?? `Sesión ${idx + 1}`),
                    fullLabel: String(point.label ?? point.date ?? point.session_id ?? `Sesión ${idx + 1}`),
                    processed_at: point.processed_at,
                    values
                };
            });
        return items.length > 0 ? items : null;
    }

    const historyByDateSource = useMemo(() => getChartSource(history.charts, ['alerts_by_date', 'sessions_by_month', 'over_time']), [history.charts]);
    const historyByCaseSource = useMemo(() => getChartSource(history.charts, ['history_by_case', 'sessions_by_case', 'activity_by_case']), [history.charts]);
    const historyByDomainSource = useMemo(() => getChartSource(history.charts, ['alerts_by_domain', 'by_domain']), [history.charts]);
    const historyByLevelSource = useMemo(() => getChartSource(history.charts, ['alerts_by_level', 'by_alert_level']), [history.charts]);

    const guardianByMonthSource = useMemo(() => getChartSource(guardianDashboard?.charts, ['alerts_by_month', 'alerts_over_time']), [guardianDashboard]);
    const guardianByDomainSource = useMemo(() => getChartSource(guardianDashboard?.charts, ['alerts_by_domain', 'domain_load_summary']), [guardianDashboard]);
    const guardianByCaseSource = useMemo(() => getChartSource(guardianDashboard?.charts, ['sessions_by_case', 'activity_by_case']), [guardianDashboard]);
    const guardianByAlertSource = useMemo(() => getChartSource(guardianDashboard?.charts, ['alerts_by_level', 'cases_by_alert_level']), [guardianDashboard]);
    const guardianQuestionnairesByStatusSource = useMemo(() => {
        const maybe = guardianDashboard as unknown as Record<string, unknown> | undefined;
        const fromBreakdowns = maybe && typeof maybe.breakdowns === 'object' && maybe.breakdowns !== null ? (maybe.breakdowns as Record<string, unknown>)['questionnaires_by_status'] : undefined;
        if (Array.isArray(fromBreakdowns)) return { items: fromBreakdowns } as unknown as QuestionnaireDashboardChartSourceDTO;
        const fromCharts = getChartSource(guardianDashboard?.charts, ['questionnaires_by_status']);
        return fromCharts ?? null;
    }, [guardianDashboard]);

    const psychologistByDomainSource = useMemo(() => getChartSource(psychologistDashboard?.charts, ['alerts_by_domain', 'by_domain']) ?? getChartSource(psychologistDashboard?.aggregates, ['by_domain']), [psychologistDashboard]);
    const psychologistByLevelSource = useMemo(() => getChartSource(psychologistDashboard?.charts, ['alerts_by_level', 'by_alert_level']) ?? getChartSource(psychologistDashboard?.aggregates, ['by_alert_level']), [psychologistDashboard]);
    const psychologistByStatusSource = useMemo(() => getChartSource(psychologistDashboard?.charts, ['reviews_by_status', 'by_review_status']) ?? getChartSource(psychologistDashboard?.aggregates, ['by_review_status']), [psychologistDashboard]);
    const psychologistByDateSource = useMemo(() => getChartSource(psychologistDashboard?.charts, ['alerts_by_date', 'over_time', 'by_date']) ?? getChartSource(psychologistDashboard?.aggregates, ['by_date']), [psychologistDashboard]);

    const guardianCharts = {
        byMonth: guardianByMonthSource ? toChartData(guardianByMonthSource) : [],
        byDomain: guardianByDomainSource ? toChartData(guardianByDomainSource) : [],
        byCase: guardianByCaseSource ? toChartData(guardianByCaseSource) : [],
        byAlert: guardianByAlertSource ? toChartData(guardianByAlertSource) : []
    };
    const guardianByMonthChart = guardianByMonthSource ? toChartData({ ...(guardianByMonthSource as unknown as QuestionnaireDashboardChartSourceDTO), items: chartItems(guardianByMonthSource).map((it: unknown, idx: number) => {
        const rec = it as Record<string, unknown>;
        return {
            id: rec.id ?? `${String(rec.period ?? rec.label ?? '')}-${idx}`,
            label: formatMonthPeriod(String(rec.period ?? rec.month ?? rec.label ?? '')),
            value: Number(rec.count ?? rec.value ?? rec.sessions ?? 0),
            tone: rec.tone as string | undefined
        };
    }) } as unknown as QuestionnaireDashboardChartSourceDTO) : [];
    const hasGuardianCharts = [guardianByMonthSource, guardianByDomainSource, guardianByCaseSource, guardianByAlertSource, guardianQuestionnairesByStatusSource].some((s) => chartItems(s).length > 0);

    function buildQuestionnairesByStatus(source: unknown) {
        const arr = chartItems(source);
        if (!Array.isArray(arr)) return [];
        const labels: Record<string, string> = {
            processed: 'Procesado',
            in_progress: 'En progreso',
            draft: 'Borrador'
        };
        return arr.map((it: unknown, idx: number) => {
            const rec = it as Record<string, unknown>;
            const status = rec.status ?? rec.label ?? String(idx);
            return {
                id: String(status),
                label: labels[String(rec.status)] ?? String(rec.label ?? rec.status ?? ''),
                value: Number(rec.count ?? rec.value ?? 0)
            };
        });
    }

    const psychologistCharts = {
        byDomain: psychologistByDomainSource ? toChartData(psychologistByDomainSource) : [],
        byLevel: psychologistByLevelSource ? toChartData(psychologistByLevelSource) : [],
        byStatus: psychologistByStatusSource ? toChartData(psychologistByStatusSource) : [],
        byDate: psychologistByDateSource ? toChartData(psychologistByDateSource) : []
    };

    const selectedCaseDomainSummarySource = useMemo(() => {
        return getChartSource(selectedCaseDetail?.charts, ['domain_summary']) ??
            (selectedCaseDetail?.domain_summary ? { items: selectedCaseDetail.domain_summary } as unknown as QuestionnaireDashboardChartSourceDTO : null);
    }, [selectedCaseDetail]);
    const selectedCaseTrendSource = useMemo(() => {
        return getChartSource(selectedCaseDetail?.charts, ['trend']) ??
            (selectedCaseDetail?.trend ? { items: selectedCaseDetail.trend } as unknown as QuestionnaireDashboardChartSourceDTO : null);
    }, [selectedCaseDetail]);

    const selectedCaseDomainSummaryMapped = useMemo(() => buildSelectedCaseDomainSummary(selectedCaseDetail), [selectedCaseDetail]);
    const selectedCaseTrendMapped = useMemo(() => buildSelectedCaseAggregateTrend(selectedCaseDetail), [selectedCaseDetail]);
    const selectedCaseDomainEvolutionMapped = useMemo(() => buildSelectedCaseDomainEvolution(selectedCaseDetail), [selectedCaseDetail]);
    const selectedCaseDomainEvolutionSeries = useMemo(() => {
        if (!Array.isArray(selectedCaseDomainEvolutionMapped) || selectedCaseDomainEvolutionMapped.length === 0) return [];
        return Object.entries(DOMAIN_EVOLUTION_LABELS)
            .filter(([key]) => selectedCaseDomainEvolutionMapped.some((item) => {
                if (!item || typeof item !== 'object') return false;
                const raw = item as Record<string, unknown>;
                return raw.values && typeof raw.values === 'object' && (raw.values as Record<string, unknown>)[key] !== undefined && (raw.values as Record<string, unknown>)[key] !== null;
            }))
            .map(([key, label]) => ({ key, label }));
    }, [selectedCaseDomainEvolutionMapped]);

    const leadingDomain = (role === 'padre' ? guardianCharts.byDomain : psychologistCharts.byDomain)[0]?.label ?? 'Sin dominio dominante';
    const leadingAlert = (chartItems(historyByLevelSource).length > 0 ? toChartData(historyByLevelSource)[0]?.label : psychologistCharts.byLevel[0]?.label) ?? 'Sin alerta dominante';
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
                    {/* Global charts: only render when backend provides the aggregate source. For padre prefer guardian charts to avoid duplicates. */}
                    {role !== 'padre' && chartItems(historyByDateSource).length > 0 ? (
                        <DashboardChartCard title="Actividad por mes" data={toChartData(historyByDateSource)} loading={history.loading} variant="area" />
                    ) : null}

                    {/* Single unified Cuestionarios por caso: prefer guardian source when padre */}
                    {(() => {
                        const source = role === 'padre' ? guardianByCaseSource ?? historyByCaseSource : historyByCaseSource;
                        return source && chartItems(source).length > 0 ? (
                            <DashboardChartCard title="Cuestionarios por caso" data={toChartData(source)} loading={history.loading} />
                        ) : null;
                    })()}

                    {role !== 'padre' && chartItems(historyByDomainSource).length > 0 ? (
                        <DashboardChartCard title="Alertas por dominio" data={toChartData(historyByDomainSource)} loading={history.loading} />
                    ) : null}

                    {role !== 'padre' && chartItems(historyByLevelSource).length > 0 ? (
                        <DashboardChartCard title="Alertas por nivel" data={toChartData(historyByLevelSource)} loading={history.loading} variant="donut" />
                    ) : null}
                </section>

                {role === 'padre' ? (
                    <>
                        {guardianError ? <div className="historial-dashboard-alert error">{guardianError}</div> : null}
                        {hasGuardianCharts ? (
                            <section className="historial-dashboard-role-block historial-dashboard-role-block--charts">
                                <div className="historial-dashboard-charts">
                                    {guardianByMonthSource && chartItems(guardianByMonthSource).length > 0 ? (
                                        <DashboardChartCard
                                            title="Alertas por mes"
                                            data={guardianByMonthChart}
                                            variant="area"
                                        />
                                    ) : null}
                                    {guardianByDomainSource && chartItems(guardianByDomainSource).length > 0 ? (
                                        <DashboardChartCard title="Alertas por dominio" data={toChartData(guardianByDomainSource)} />
                                    ) : null}
                                    {/* 'Casos por alerta' intentionally removed from Historial per product decision */}
                                    {guardianQuestionnairesByStatusSource && chartItems(guardianQuestionnairesByStatusSource).length > 0 ? (
                                        <DashboardChartCard title="Estado de cuestionarios" data={buildQuestionnairesByStatus(guardianQuestionnairesByStatusSource)} variant="donut" />
                                    ) : null}
                                </div>
                            </section>
                        ) : null}
                        <section className="historial-dashboard-case-list-block">
                            <div className="historial-dashboard-cases-list">
                                {guardianCases.map((caseItem) => (
                                    <article key={caseItem.case_id} className="historial-dashboard-case-card historial-case-card">
                                        <h3>{resolveCaseLabel(caseItem)}</h3>
                                        <div><strong>Código del caso:</strong> {getString(caseItem.case_public_id)}</div>
                                        <div><strong>Cuestionarios:</strong> {caseItem.sessions_count ?? 0}</div>
                                        <div><strong>Procesadas:</strong> {caseItem.processed_sessions_count ?? 0}</div>
                                        <div className="historial-dashboard-card-inline"><strong>Última alerta:</strong> <AlertBadge level={caseItem.latest_alert_level} /></div>
                                        <div><strong>Dominio:</strong> {getDashboardDomainLabel(caseItem.latest_domain)}</div>
                                        <button type="button" className="historial-dashboard-btn" onClick={() => setSelectedCaseId(caseItem.case_id)}>{selectedCaseId === caseItem.case_id ? 'Cerrar detalle' : 'Ver detalle'}</button>
                                        {selectedCaseId === caseItem.case_id ? (
                                            <div className="historial-dashboard-case-detail historial-case-detail-panel">
                                                <div className="historial-dashboard-case-detail-header">
                                                    <h3>Detalle del caso</h3>
                                                    <button type="button" className="historial-dashboard-btn secondary" onClick={() => setSelectedCaseId(null)}>Cerrar detalle</button>
                                                </div>
                                                {caseDetailLoading ? <div className="historial-dashboard-empty">Cargando detalle del caso...</div> : null}
                                                {!caseDetailLoading && selectedCaseDetail ? (
                                                    <>
                                                        <div className="historial-dashboard-charts detail-chart-grid">
                                                            <DashboardChartCard title="Resumen por dominio" data={toChartData(selectedCaseDomainSummaryMapped ?? selectedCaseDomainSummarySource)} formatter={(value) => `${value.toFixed(1)} %`} includeZeroValues />
                                                            <DashboardChartCard title="Tendencia general del caso" description="Evolución de la carga sintomática agregada entre cuestionarios procesados." data={toChartData(selectedCaseTrendMapped ?? selectedCaseTrendSource)} variant="line" series={[{ key: 'value', label: 'Carga sintomática agregada' }]} formatter={(value) => `${value.toFixed(1)} %`} />
                                                            {selectedCaseDomainEvolutionMapped && Array.isArray(selectedCaseDomainEvolutionMapped) && selectedCaseDomainEvolutionMapped.length > 0 ? (
                                                                <DashboardChartCard
                                                                    title="Evolución por dominio"
                                                                    description="Comparación de la carga sintomática de cada dominio entre cuestionarios."
                                                                    data={selectedCaseDomainEvolutionMapped as DashboardChartItem[]}
                                                                    variant="line"
                                                                    series={selectedCaseDomainEvolutionSeries}
                                                                    formatter={(value) => `${value.toFixed(1)} %`}
                                                                />
                                                            ) : null}
                                                        </div>
                                                        <div className="historial-dashboard-session-list">
                                                            {selectedCaseDetail.sessions.map((item) => (
                                                                <article className="historial-dashboard-session-card" key={item.id}>
                                                                    <div className="historial-dashboard-card-inline"><strong>{resolveHistoryItemCaseLabel(item)}</strong><AlertBadge level={item.latest_alert_level} /></div>
                                                                    <div><strong>Estado:</strong> {getStatusLabel(item.status)}</div>
                                                                    <div><strong>Dominio:</strong> {getDashboardDomainLabel(item.dominant_domain)}</div>
                                                                    <div><strong>Fecha:</strong> {formatDateTimeEsCO(item.processed_at ?? item.updated_at)}</div>
                                                                    {(() => {
                                                                        const reviewStatus = resolveHistoryItemReviewStatus(item);
                                                                        return reviewStatus ? <div><strong>Revisión registrada:</strong> {reviewStatus}</div> : null;
                                                                    })()}
                                                                    <button type="button" className="historial-dashboard-btn" onClick={() => openDetail(item.id).catch(() => undefined)}>Ver reporte</button>
                                                                </article>
                                                            ))}
                                                        </div>
                                                    </>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </article>
                                ))}
                            </div>
                        </section>
                    </>
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
