import { useCallback, useEffect, useMemo, useState } from 'react';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { AlertBadge } from '../../../components/AlertBadge/AlertBadge';
import { DashboardChartCard } from '../../../components/DashboardCharts';
import type { DashboardChartItem } from '../../../components/DashboardCharts';
import { ActiveFilterChips } from '../../../components/ActiveFilterChips/ActiveFilterChips';
import { QuestionnaireReportDetailModal } from '../../../components/questionnaires/QuestionnaireReportDetailModal';
import { useHistoryHasActiveFilters, useQuestionnaireHistoryV2 } from '../../../hooks/questionnaires/useQuestionnaireHistoryV2';
import {
    getQuestionnaireCaseDetailV2,
    getQuestionnaireCasesV2
} from '../../../services/questionnaires/questionnaires.api';

import type {
    QuestionnaireCaseDetailV2Response,
    QuestionnaireCaseV2DTO,
    QuestionnaireDashboardChartSourceDTO,
    QuestionnaireHistoryFiltersV2,
    QuestionnaireHistoryItemV2DTO
} from '../../../services/questionnaires/questionnaires.types';

import { mapApiErrorToUserMessage, formatDateTimeEsCO, getModeLabel, getRoleLabel, getStatusLabel } from '../../../utils/presentation/naturalLanguage';
import { resolveCaseCompositeLabel, getDashboardDomainLabel } from '../../../utils/questionnaires/dashboardLabels';
import { buildActiveFilterChips, buildHistoryKpis } from '../../../utils/questionnaires/dashboardTransform';
import { getChartSource, getChartItems } from '../../../utils/questionnaires/chartContract';
import { findFirstVisibleProfessionalReview, normalizeReviewStatus } from '../../../utils/questionnaires/presentation';
import './HistorialBase.css';

// local fallback for default filters (kept simple)
function defaultFilters(): QuestionnaireHistoryFiltersV2 {
    return { page: 1, page_size: 10 } as unknown as QuestionnaireHistoryFiltersV2;
}

function getString(value: unknown, fallback = '--') {
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

// Local simple helpers and options (kept minimal to avoid large refactors)
function toMaybeBoolean(value: string) {
    if (value === '') return undefined;
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return undefined;
}

function normalizeDraftFilters(filters: QuestionnaireHistoryFiltersV2) {
    return filters as unknown as QuestionnaireHistoryFiltersV2;
}

const pageSizeOptions = [
    { value: '10', label: '10' },
    { value: '25', label: '25' },
    { value: '50', label: '50' }
] as const;

function toHistoryStatusFilter(value: string): QuestionnaireHistoryFiltersV2['status'] {
    if (!value || value === '') return undefined;
    return value as unknown as QuestionnaireHistoryFiltersV2['status'];
}

const DOMAIN_EVOLUTION_LABELS: Record<string, string> = {
    adhd: 'TDAH',
    anxiety: 'Ansiedad',
    depression: 'Depresión',
    conduct: 'Conducta',
    elimination: 'Eliminación'
};

const DOMAIN_LABELS: Record<string, string> = {
    adhd: 'TDAH',
    anxiety: 'Ansiedad',
    depression: 'Depresión',
    conduct: 'Conducta',
    elimination: 'Eliminación'
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

const REVIEW_STATUS_LABELS: Record<string, string> = {
    pending: 'Pendiente',
    reviewed: 'Revisado',
    closed: 'Cerrado',
    rejected: 'Rechazado'
};

function buildReviewStatusChart(source: unknown) {
    const arr = chartItems(source);
    if (!Array.isArray(arr)) return [];

    return arr.map((rawItem: unknown, idx: number) => {
        const item = rawItem as Record<string, unknown>;
        const status = String(
            item.review_status ??
            item.status ??
            item.key ??
            item.label ??
            `status-${idx}`
        );
        const count = Number(item.count ?? item.value ?? item.total ?? 0);
        return {
            id: status,
            key: status,
            label: REVIEW_STATUS_LABELS[status] ?? status,
            value: count,
            count,
            raw: item
        };
    });
}

function toChartData(source: unknown): DashboardChartItem[] {
    const items = getChartItems(source as unknown as QuestionnaireDashboardChartSourceDTO) ?? [];
    return (items as Array<Record<string, unknown>>).map((rec, idx) => ({
        id: String(rec.id ?? rec.key ?? `item-${idx}`),
        label: String(rec.label ?? rec.name ?? rec.key ?? rec.month ?? rec.date ?? `Item ${idx + 1}`),
        value: Number(rec.count ?? rec.value ?? rec.total ?? rec.sessions ?? 0),
        tone: typeof rec.tone === 'string' ? rec.tone : typeof rec.alert_level === 'string' ? rec.alert_level : undefined,
        raw: rec
    }));
}

function resolveCaseLabel(caseItem: QuestionnaireCaseV2DTO | Record<string, unknown> | null | undefined) {
    if (!caseItem) return '--';
    const rec = caseItem as Record<string, unknown>;
    const label = resolveCaseCompositeLabel({
        display_label: rec.display_label as string | undefined,
        private_label: rec.private_label as string | undefined,
        case_label: rec.case_label as string | undefined,
        case_public_id: rec.case_public_id as string | undefined,
        case_id: rec.case_id as string | undefined
    });
    return label;
}

type HistorialBaseProps = { role: 'padre' | 'psicologo' };

function makeTitle(role: string) {
    return role === 'padre' ? 'Historial' : 'Historial profesional';
}

function makeDescription(role: string) {
    return role === 'padre' ? 'Panel de historial para padres' : 'Panel de historial para profesionales';
}

const periodOptions = [
    { value: '3', label: 'Últimos 3 meses' },
    { value: '6', label: 'Últimos 6 meses' },
    { value: '12', label: 'Últimos 12 meses' }
] as const;

const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'processed', label: 'Procesados' },
    { value: 'submitted', label: 'Enviados' },
    { value: 'in_progress', label: 'En progreso' }
] as const;

const domainOptions = [{ value: '', label: 'Todos' }];
const alertOptions = [{ value: '', label: 'Todas' }];
const reviewOptions = [{ value: '', label: 'Todos' }, { value: 'true', label: 'Requieren revisión' }, { value: 'false', label: 'Revisados' }];
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

function resolveSummaryCodeLabel(
    value: unknown,
    fallbackLabel: string,
    labels?: Record<string, string>
) {
    if (typeof value === 'string') {
        return {
            code: value,
            label: labels?.[value] ?? value,
            count: undefined as number | undefined
        };
    }

    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        const code = typeof record.code === 'string'
            ? record.code
            : typeof record.domain === 'string'
                ? record.domain
                : typeof record.alert_level === 'string'
                    ? record.alert_level
                    : typeof record.key === 'string'
                        ? record.key
                        : '';

        const labelValue = typeof record.label === 'string' && record.label.trim().length > 0
            ? record.label
            : code
                ? labels?.[code] ?? code
                : fallbackLabel;

        const countValue = Number(record.count ?? record.value ?? record.total);
        const count = Number.isFinite(countValue) ? countValue : undefined;

        return {
            code: code || labelValue,
            label: labelValue,
            count
        };
    }

    return {
        code: '',
        label: fallbackLabel,
        count: undefined as number | undefined
    };
}
export function HistorialBase({ role }: Readonly<HistorialBaseProps>) {
    const history = useQuestionnaireHistoryV2({ initialFilters: { page: 1, page_size: 10 } });
    const [draftFilters, setDraftFilters] = useState<QuestionnaireHistoryFiltersV2>(() => defaultFilters());
    const [period, setPeriod] = useState('6');
    const [filtersOpen, setFiltersOpen] = useState(false);

    const [guardianCases, setGuardianCases] = useState<QuestionnaireCaseV2DTO[]>([]);
    const [guardianCasesError, setGuardianCasesError] = useState<string | null>(null);

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
        const loadCases = async () => {
            setGuardianCasesError(null);
            try {
                const cases = await getQuestionnaireCasesV2({
                    status: history.filters.status,
                    q: history.filters.q,
                    label: history.filters.case_label,
                    case_public_id: history.filters.case_public_id,
                    latest_alert_level: history.filters.alert_level,
                    date_from: history.filters.date_from,
                    date_to: history.filters.date_to,
                    page: 1,
                    page_size: 12
                });
                setGuardianCases(cases.items);
            } catch (error) {
                setGuardianCases([]);
                setGuardianCasesError(mapApiErrorToUserMessage(error, 'No fue posible cargar los casos relacionados.'));
            }
        };
        loadCases().catch(() => undefined);
    }, [history.filters.alert_level, history.filters.case_label, history.filters.case_public_id, history.filters.date_from, history.filters.date_to, history.filters.q, history.filters.status, role]);

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

    const buildPsychologistByCaseChart = useCallback((source: unknown): DashboardChartItem[] => {
        const items = chartItems(source);
        return items.map((rawItem, idx) => {
            const item = rawItem as Record<string, unknown>;
            const label = item.label ?? item.case_public_id ?? item.case_id ?? `Caso ${idx + 1}`;
            return {
                id: String(item.case_id ?? item.case_public_id ?? item.id ?? `case-${idx}`),
                label: String(label),
                value: Number(item.count ?? item.value ?? item.total ?? item.sessions ?? 0),
                raw: item
            };
        });
    }, []);

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

    // Note: history* chart sources removed from global scope to avoid rendering psychologist charts here.

    const guardianByMonthSource = useMemo(() => getChartSource(history.charts, ['alerts_by_month', 'alerts_over_time', 'activity_over_time', 'sessions_by_month']), [history.charts]);
    const guardianByDomainSource = useMemo(() => getChartSource(history.charts, ['alerts_by_domain', 'domain_load_summary', 'by_domain']), [history.charts]);
    const guardianByCaseSource = useMemo(() => getChartSource(history.charts, ['sessions_by_case', 'activity_by_case', 'by_case', 'history_by_case']), [history.charts]);
    const guardianByAlertSource = useMemo(() => getChartSource(history.charts, ['alerts_by_level', 'cases_by_alert_level', 'by_alert_level']), [history.charts]);
    const guardianQuestionnairesByStatusSource = useMemo(() => {
        const fromCharts = getChartSource(history.charts, ['questionnaires_by_status', 'by_status']);
        return fromCharts ?? null;
    }, [history.charts]);

    const psychologistAlertsByDomainSource = useMemo(() => getChartSource(history.charts, ['alerts_by_domain', 'by_domain']), [history.charts]);
    const psychologistByLevelSource = useMemo(() => getChartSource(history.charts, ['alerts_by_level', 'by_alert_level']), [history.charts]);
    const psychologistByStatusSource = useMemo(() => getChartSource(history.charts, ['reviews_by_status', 'by_review_status', 'needs_review']), [history.charts]);
    const psychologistByCaseSource = useMemo(() => getChartSource(history.charts, ['cases_by_alert', 'activity_by_case', 'history_by_case', 'cases_by_case', 'by_case']), [history.charts]);
    const psychologistByCaseChart = useMemo(() => {
        return psychologistByCaseSource ? buildPsychologistByCaseChart(psychologistByCaseSource) : [];
    }, [psychologistByCaseSource, buildPsychologistByCaseChart]);
    const psychologistByDateSource = useMemo(() => getChartSource(history.charts, ['alerts_by_date', 'over_time', 'by_date', 'activity_over_time', 'sessions_by_month']), [history.charts]);

    const psychologistDominantDomainData = useMemo(() => {
        if (role !== 'psicologo' || !history.summary) return [];

        const dominant = resolveSummaryCodeLabel(
            (history.summary as Record<string, unknown>).dominant_domain,
            'Sin dominio dominante',
            DOMAIN_LABELS
        );

        if (!dominant.code) return [];

        return [
            {
                id: dominant.code,
                key: dominant.code,
                label: dominant.label,
                value: dominant.count ?? 1,
                count: dominant.count ?? 1,
                raw: dominant
            }
        ];
    }, [history.summary, role]);

    const psychologistByDateChart = useMemo(() => {
        if (!psychologistByDateSource) return [];
        const items = chartItems(psychologistByDateSource).map((it: unknown, idx: number) => {
            const rec = it as Record<string, unknown>;
            const rawLabel = String(rec.period ?? rec.month ?? rec.label ?? '');
            const formattedLabel = formatMonthPeriod(rawLabel) || rawLabel || `Item ${idx + 1}`;
            return {
                id: String(rec.id ?? rec.key ?? `item-${idx}`),
                label: formattedLabel,
                value: Number(rec.count ?? rec.value ?? rec.sessions ?? 0),
                tone: typeof rec.tone === 'string' ? rec.tone : typeof rec.alert_level === 'string' ? rec.alert_level : undefined,
                raw: rec
            };
        });
        return toChartData({ ...(psychologistByDateSource as unknown as QuestionnaireDashboardChartSourceDTO), items } as unknown as QuestionnaireDashboardChartSourceDTO);
    }, [psychologistByDateSource]);

    const summaryHighestAlert = useMemo(() => {
        if (!history.summary) return null;
        return resolveSummaryCodeLabel(
            (history.summary as Record<string, unknown>).highest_alert_level,
            'Sin alerta dominante'
        );
    }, [history.summary]);

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
    const hasGuardianCharts = role === 'padre' && [guardianByMonthSource, guardianByDomainSource, guardianByCaseSource, guardianByAlertSource, guardianQuestionnairesByStatusSource].some((s) => chartItems(s).length > 0);

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
        byDomain: psychologistAlertsByDomainSource ? toChartData(psychologistAlertsByDomainSource) : [],
        byLevel: psychologistByLevelSource ? toChartData(psychologistByLevelSource) : [],
        byStatus: psychologistByStatusSource ? toChartData(psychologistByStatusSource) : [],
        byDate: psychologistByDateSource ? toChartData(psychologistByDateSource) : []
    };

    const selectedCaseDomainSummarySource = useMemo(() => {
        return getChartSource(selectedCaseDetail?.charts, ['domain_summary']) ??
            (selectedCaseDetail?.domain_summary ? { items: selectedCaseDetail.domain_summary } as unknown as QuestionnaireDashboardChartSourceDTO : null);
    }, [selectedCaseDetail]);

    const selectedCaseDomainSummaryMapped = useMemo(() => buildSelectedCaseDomainSummary(selectedCaseDetail), [selectedCaseDetail]);
    
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

    const leadingDomain = role === 'padre'
        ? String(guardianCharts.byDomain[0]?.label ?? 'Sin dominio dominante')
        : String(psychologistDominantDomainData[0]?.label ?? 'Sin dominio dominante');
    const leadingAlert = role === 'padre'
        ? String(guardianCharts.byAlert[0]?.label ?? 'Sin alerta dominante')
        : String(summaryHighestAlert?.label ?? psychologistCharts.byLevel[0]?.label ?? 'Sin alerta dominante');
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
                <div className="historial-page-content">
                    <section className="historial-dashboard-section">
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
                        <strong>{summaryNumber(history.summary as Record<string, unknown> | undefined, ['cases_with_alerts', 'with_alert_count', 'cases_visible', 'total_records'])}</strong>
                    </article>
                </section>

                <section className="historial-dashboard-charts">
                    {/* Global charts: only render guardian/parent charts here. Do NOT render psychologist charts from history sources. */}
                    {role === 'padre' && guardianByMonthSource && chartItems(guardianByMonthSource).length > 0 ? (
                        <DashboardChartCard title="Actividad por mes" data={guardianByMonthChart} loading={history.loading} variant="area" />
                    ) : null}

                    {role === 'padre' && guardianByCaseSource && chartItems(guardianByCaseSource).length > 0 ? (
                        <DashboardChartCard title="Cuestionarios por caso" data={toChartData(guardianByCaseSource)} loading={history.loading} />
                    ) : null}

                    {role === 'padre' && guardianByAlertSource && chartItems(guardianByAlertSource).length > 0 ? (
                        <DashboardChartCard title="Distribución de alertas por nivel" data={toChartData(guardianByAlertSource)} loading={history.loading} variant="donut" />
                    ) : null}
                </section>

                {role === 'padre' ? (
                    <>
                        {guardianCasesError ? <div className="historial-dashboard-alert error">{guardianCasesError}</div> : null}
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

                    <section className="historial-cases-section">
                        <div className="historial-cases-list historial-dashboard-cases-list">
                            {guardianCases.map((caseItem) => (
                                <article key={caseItem.case_id} className="historial-dashboard-case-card historial-case-card historial-case-card--separated">
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
                        <div className="historial-dashboard-charts">
                            {psychologistDominantDomainData.length > 0 ? (
                                <DashboardChartCard title="Dominio predominante por evaluación" data={psychologistDominantDomainData} loading={history.loading} includeZeroValues />
                            ) : null}
                            {psychologistByLevelSource && chartItems(psychologistByLevelSource).length > 0 ? (
                                <DashboardChartCard title="Distribución de alertas por nivel" data={toChartData(psychologistByLevelSource)} loading={history.loading} variant="donut" />
                            ) : null}
                            {psychologistByStatusSource && chartItems(psychologistByStatusSource).length > 0 ? (
                                <DashboardChartCard title="Estado de revisión profesional" data={buildReviewStatusChart(psychologistByStatusSource)} loading={history.loading} variant="donut" includeZeroValues />
                            ) : null}
                            {psychologistByDateSource && chartItems(psychologistByDateSource).length > 0 ? (
                                <DashboardChartCard title="Evolución por rango de fechas" data={psychologistByDateChart} loading={history.loading} variant="area" />
                            ) : null}
                            {psychologistByCaseChart.length > 0 ? (
                                <DashboardChartCard title="Evaluaciones por caso" data={psychologistByCaseChart} loading={history.loading} />
                            ) : null}
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
            </div>
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
