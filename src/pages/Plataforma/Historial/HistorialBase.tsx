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
    getQuestionnaireHistoryResponsesV2,
    getQuestionnaireHistoryResultsV2,
    getQuestionnaireProfessionalReviewsV2,
    searchPsychologistsV2,
    shareQuestionnaireWithPsychologistV2
} from '../../../services/questionnaires/questionnaires.api';
import type {
    QuestionnaireCaseDetailV2Response,
    QuestionnaireCaseV2DTO,
    QuestionnaireClinicalSummaryV2DTO,
    QuestionnaireDashboardChartPointDTO,
    QuestionnaireGuardianDashboardV2Response,
    QuestionnaireHistoryFiltersV2,
    QuestionnaireHistoryItemV2DTO,
    QuestionnaireHistoryResponsesV2Response,
    QuestionnairePdfInfoV2DTO,
    QuestionnaireProfessionalReviewDTO,
    PsychologistSearchItemDTO,
    QuestionnairePsychologistDashboardV2Response,
    QuestionnaireSecureResultsV2DTO,
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
    normalizeBackendText,
    normalizeDomainLabel,
    normalizeRequestStatus,
    normalizeReviewStatus
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
function canLoadClinicalArtifacts(status: string | null | undefined) {
    const normalized = (status ?? '').trim().toLowerCase();
    return normalized === 'submitted' || normalized === 'processed';
}
function canDownloadPdfForStatus(status: string | null | undefined) {
    return (status ?? '').trim().toLowerCase() === 'processed';
}
function makeTitle(role: HistorialRole) {
    return role === 'padre' ? 'Historial de cuestionarios' : 'Evaluaciones recibidas e historial';
}
function makeDescription(role: HistorialRole) {
    return role === 'padre'
        ? 'Consulta cuestionarios aplicados, resultados orientativos y evolución por caso.'
        : 'Visualiza evaluaciones compartidas, alertas y estado de revisión.';
}
async function loadDetail(sessionId: string) {
    const detail = await getQuestionnaireHistoryDetailV2(sessionId);
    const reviews = await getQuestionnaireProfessionalReviewsV2(sessionId).catch(() => []);
    const responses = await getQuestionnaireHistoryResponsesV2(sessionId).catch(() => ({ items: [], warnings: [] }));
    if (!canLoadClinicalArtifacts(detail.status)) return { detail, results: null, summary: null, reviews, responses };
    const [results, summary] = await Promise.allSettled([
        getQuestionnaireHistoryResultsV2(sessionId),
        getQuestionnaireClinicalSummaryV2(sessionId)
    ]);
    return {
        detail,
        results: results.status === 'fulfilled' ? results.value : null,
        summary: summary.status === 'fulfilled' ? summary.value : null,
        reviews,
        responses
    };
}
function KeyValueRows({ data, hidden = [], emptyText }: Readonly<{ data: Record<string, unknown> | null; hidden?: string[]; emptyText: string }>) {
    const rows = buildSafeDisplayRows(data, { includeTechnical: false, includeEmpty: false, hiddenFields: hidden });
    if (rows.length === 0) return <p className="historial-dashboard-helper">{emptyText}</p>;
    return <div className="historial-dashboard-kv-grid">{rows.map((row) => <div key={row.key}><strong>{row.label}</strong><span>{row.value}</span></div>)}</div>;
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
function toTextList(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => normalizeBackendText(item, ''))
        .filter((item) => item.trim().length > 0);
}
function formatPercentValue(value: unknown) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '--';
    const percent = numeric > 1 ? numeric : numeric * 100;
    return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: percent < 1 ? 1 : 0 }).format(percent)}%`;
}
function responseQuestionText(item: Record<string, unknown>) {
    return normalizeBackendText(item.prompt ?? item.question_text ?? item.question ?? item.text, 'Pregunta registrada');
}
function responseAnswerText(item: Record<string, unknown>) {
    if (item.missing === true || item.is_missing === true) return 'Sin respuesta registrada';
    return normalizeBackendText(item.answer_label ?? item.answer ?? item.answer_value ?? item.value, 'Sin respuesta registrada');
}
function groupedResponses(responses: QuestionnaireHistoryResponsesV2Response | null) {
    const groups = new Map<string, Record<string, unknown>[]>();
    (responses?.items ?? []).forEach((item) => {
        const record = toRecord(item);
        if (!record) return;
        const groupLabel = normalizeDomainLabel(record.domain_label ?? record.domain ?? record.domain_code ?? record.section_title ?? record.section);
        const safeLabel = groupLabel === 'General' ? 'Señales globales' : groupLabel;
        groups.set(safeLabel, [...(groups.get(safeLabel) ?? []), record]);
    });
    return [...groups.entries()].map(([label, items]) => ({ label, items }));
}
function firstDetailText(records: Array<Record<string, unknown> | null | undefined>, keys: string[], fallback = '--') {
    for (const record of records) {
        if (!record) continue;
        for (const key of keys) {
            const value = normalizeBackendText(record[key], '');
            if (value) return value;
        }
    }
    return fallback;
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
    const [detailPayload, setDetailPayload] = useState<QuestionnaireHistoryItemV2DTO | null>(null);
    const [resultsPayload, setResultsPayload] = useState<QuestionnaireSecureResultsV2DTO | null>(null);
    const [responsesPayload, setResponsesPayload] = useState<QuestionnaireHistoryResponsesV2Response | null>(null);
    const [clinicalSummaryPayload, setClinicalSummaryPayload] = useState<QuestionnaireClinicalSummaryV2DTO | null>(null);
    const [professionalReviews, setProfessionalReviews] = useState<QuestionnaireProfessionalReviewDTO[]>([]);
    const [pdfPayload, setPdfPayload] = useState<QuestionnairePdfInfoV2DTO | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [detailNotice, setDetailNotice] = useState<string | null>(null);
    const [pdfWorking, setPdfWorking] = useState(false);

    const [newTag, setNewTag] = useState('');
    const [newTagColor, setNewTagColor] = useState(defaultTagColor);
    const [newTagVisibility, setNewTagVisibility] = useState<QuestionnaireTagVisibility>('private');
    const [psychologistQuery, setPsychologistQuery] = useState('');
    const [psychologistResults, setPsychologistResults] = useState<PsychologistSearchItemDTO[]>([]);
    const [selectedPsychologistId, setSelectedPsychologistId] = useState('');
    const [psychologistSearchLoading, setPsychologistSearchLoading] = useState(false);
    const [shareWorking, setShareWorking] = useState(false);
    const [shareStatus, setShareStatus] = useState<string | null>(null);

    const hasActiveFilters = useHistoryHasActiveFilters(history.filters);
    const filterChips = useMemo(() => buildActiveFilterChips(history.filters), [history.filters]);
    const kpis = useMemo(() => buildHistoryKpis(history.items, history.summary, history.total), [history.items, history.summary, history.total]);
    const tags = useMemo(() => detailPayload?.tags ?? [], [detailPayload]);
    const clinicalSections = useMemo(() => buildClinicalSummarySections(clinicalSummaryPayload), [clinicalSummaryPayload]);
    const clinicalRisk = useMemo(() => getRiskLevelPresentation(clinicalSummaryPayload?.overall_risk_level ?? null), [clinicalSummaryPayload?.overall_risk_level]);
    const clinicalDisclaimer = useMemo(() => getSafeClinicalDisclaimer(clinicalSummaryPayload), [clinicalSummaryPayload]);
    const clinicalComorbiditySummary = useMemo(() => getClinicalComorbiditySummary(clinicalSummaryPayload), [clinicalSummaryPayload]);
    const isPdfReady = useMemo(() => ['ready', 'completed', 'generated', 'available', 'done'].includes(String(pdfPayload?.status ?? '').toLowerCase()), [pdfPayload?.status]);
    const canDownloadDetailPdf = useMemo(() => canDownloadPdfForStatus(detailPayload?.status), [detailPayload?.status]);

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
        setDetailLoading(true);
        setDetailError(null);
        setDetailNotice(null);
        setPdfPayload(null);
        setDetailPayload(null);
        setResultsPayload(null);
        setResponsesPayload(null);
        setClinicalSummaryPayload(null);
        setProfessionalReviews([]);
        try {
            const detail = await loadDetail(sessionId);
            setDetailPayload(detail.detail);
            setResultsPayload(detail.results);
            setResponsesPayload(detail.responses);
            setClinicalSummaryPayload(detail.summary);
            setProfessionalReviews(detail.reviews);
            if (role === 'padre') {
                searchPsychologists(true).catch(() => undefined);
            }
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
        setResponsesPayload(null);
        setClinicalSummaryPayload(null);
        setProfessionalReviews([]);
        setPdfPayload(null);
        setDetailError(null);
        setDetailNotice(null);
        setNewTag('');
        setPsychologistQuery('');
        setPsychologistResults([]);
        setSelectedPsychologistId('');
        setShareStatus(null);
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
    const searchPsychologists = async (sameLocation = false) => {
        setPsychologistSearchLoading(true);
        setDetailError(null);
        try {
            const response = await searchPsychologistsV2({
                q: sameLocation ? undefined : toOptionalFilterText(psychologistQuery),
                same_location: sameLocation || undefined,
                page: 1,
                page_size: 8
            });
            setPsychologistResults(response.items);
            if (response.items.length === 1) setSelectedPsychologistId(response.items[0].user_id);
        } catch (error) {
            setPsychologistResults([]);
            setDetailError(mapApiErrorToUserMessage(error, 'No fue posible buscar psicólogos.'));
        } finally {
            setPsychologistSearchLoading(false);
        }
    };
    const sendToPsychologist = async () => {
        if (!detailSessionId) return;
        if (!selectedPsychologistId) {
            setDetailError('Selecciona un psicólogo para enviar la solicitud.');
            return;
        }
        setShareWorking(true);
        setDetailError(null);
        try {
            const payload = await shareQuestionnaireWithPsychologistV2(detailSessionId, {
                grantee_user_id: selectedPsychologistId,
                grant_can_download_pdf: true,
                grant_can_tag: false,
                share_scope: 'session'
            });
            const requestStatus = payload.grant?.request_status ?? 'pending';
            setShareStatus(requestStatus);
            setDetailNotice(`Solicitud enviada. Estado: ${normalizeRequestStatus(requestStatus)}.`);
            setProfessionalReviews(await getQuestionnaireProfessionalReviewsV2(detailSessionId).catch(() => []));
        } catch (error) {
            setDetailError(mapApiErrorToUserMessage(error, 'No fue posible enviar la solicitud al psicólogo.'));
        } finally {
            setShareWorking(false);
        }
    };
    const downloadPdf = async (regenerate = false) => {
        if (!detailSessionId) return;
        if (!canDownloadDetailPdf) {
            setDetailError('El PDF estará disponible cuando el cuestionario esté procesado.');
            return;
        }
        setPdfWorking(true);
        setDetailError(null);
        try {
            if (regenerate) {
                await generateQuestionnaireHistoryPdfV2(detailSessionId);
            }
            if (!regenerate && !isPdfReady) {
                await generateQuestionnaireHistoryPdfV2(detailSessionId);
            }
            setPdfPayload(await getQuestionnaireHistoryPdfV2(detailSessionId).catch(() => pdfPayload));
            const file = await downloadQuestionnaireHistoryPdfV2(detailSessionId);
            const href = URL.createObjectURL(file.blob);
            const anchor = document.createElement('a');
            anchor.href = href;
            anchor.download = file.filename;
            anchor.click();
            URL.revokeObjectURL(href);
            setDetailNotice('PDF descargado correctamente.');
        } catch (error) {
            setDetailError(mapApiErrorToUserMessage(error, 'No fue posible descargar PDF.'));
        } finally {
            setPdfWorking(false);
        }
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

            <Modal isOpen={detailSessionId !== null} onClose={closeDetail}>
                <div className="historial-dashboard-modal">
                    <h2>Detalle de cuestionario</h2>
                    {detailLoading ? <div className="historial-dashboard-empty">Cargando detalle...</div> : null}
                    {detailError ? <div className="historial-dashboard-alert error">{detailError}</div> : null}
                    {detailNotice ? <div className="historial-dashboard-alert success">{detailNotice}</div> : null}
                    {!detailLoading && detailPayload ? (
                        <>
                            {(() => {
                                const resultRecord = toRecord(resultsPayload?.result ?? resultsPayload);
                                const sessionRecord = toRecord(resultsPayload?.session);
                                const safetyFlags = [
                                    ...toTextList(detailPayload.safety_flags),
                                    ...toTextList(resultRecord?.safety_flags)
                                ];
                                const safetySignals = [
                                    ...toTextList(detailPayload.safety_signal_items),
                                    ...toTextList(resultRecord?.safety_signal_items)
                                ];
                                const inconsistencyFlags = [
                                    ...toTextList(detailPayload.inconsistency_flags),
                                    ...toTextList(resultRecord?.inconsistency_flags),
                                    ...toTextList(detailPayload.clinical_consistency_warnings),
                                    ...toTextList(resultRecord?.clinical_consistency_warnings)
                                ];
                                const contextNotes = [
                                    ...(Array.isArray(detailPayload.developmental_context_notes)
                                        ? toTextList(detailPayload.developmental_context_notes)
                                        : [normalizeBackendText(detailPayload.developmental_context_notes, '')].filter(Boolean)),
                                    ...(Array.isArray(resultRecord?.developmental_context_notes)
                                        ? toTextList(resultRecord?.developmental_context_notes)
                                        : [normalizeBackendText(resultRecord?.developmental_context_notes, '')].filter(Boolean))
                                ];
                                const scoreLabel = firstDetailText([resultRecord, detailPayload], ['score_label']);
                                const scoreExplanation = firstDetailText([resultRecord, detailPayload], ['score_explanation'], '');
                                const completedBy = firstDetailText([detailPayload, sessionRecord], ['completed_by_display_name']);
                                const completedRole = firstDetailText([detailPayload, sessionRecord], ['completed_by_role']);
                                const relationship = firstDetailText([detailPayload, sessionRecord], ['respondent_relationship']);
                                const appliedAtRaw = firstDetailText([detailPayload, sessionRecord], ['applied_at', 'submitted_at', 'processed_at'], '');
                                const appliedAt = appliedAtRaw ? formatDateTimeEsCO(appliedAtRaw) : 'Sin fecha registrada';
                                const primaryDomain = toRecord(resultRecord?.primary_domain);
                                const domainLabel = normalizeDomainLabel(firstDetailText([primaryDomain, detailPayload, resultRecord], ['domain_label', 'domain', 'domain_code', 'dominant_domain'], 'Sin dominio predominante'));
                                const alertLabel = normalizeAlertLevel(firstDetailText([detailPayload, resultRecord], ['latest_alert_level', 'alert_level'], ''));

                                return (
                                    <>
                                        <div className="historial-dashboard-modal-section historial-dashboard-critical-summary">
                                            <h3>Lectura responsable del resultado</h3>
                                            <div className="historial-dashboard-kv-grid">
                                                <div><strong>Dominio principal</strong><span>{domainLabel}</span></div>
                                                <div><strong>Nivel orientativo</strong><span>{alertLabel}</span></div>
                                                <div><strong>Escala reportada</strong><span>{scoreLabel}</span></div>
                                                <div><strong>Aplicación</strong><span>{appliedAt}</span></div>
                                            </div>
                                            {scoreExplanation ? (
                                                <p className="historial-dashboard-helper">{scoreExplanation}</p>
                                            ) : (
                                                <p className="historial-dashboard-helper">
                                                    El porcentaje o puntaje no representa una probabilidad diagnóstica. Debe leerse como una señal orientativa para seguimiento.
                                                </p>
                                            )}
                                        </div>

                                        <div className="historial-dashboard-modal-section">
                                            <h3>Trazabilidad de aplicación</h3>
                                            <div className="historial-dashboard-kv-grid">
                                                <div><strong>Completado por</strong><span>{completedBy}</span></div>
                                                <div><strong>Rol</strong><span>{getRoleLabel(completedRole)}</span></div>
                                                <div><strong>Relación</strong><span>{relationship}</span></div>
                                                <div><strong>Procesado</strong><span>{formatDateTimeEsCO(detailPayload.processed_at)}</span></div>
                                            </div>
                                        </div>

                                        {(safetyFlags.length > 0 || safetySignals.length > 0 || detailPayload.urgent_referral_recommended) ? (
                                            <div className="historial-dashboard-modal-section historial-dashboard-safety">
                                                <h3>Señales de seguridad</h3>
                                                {detailPayload.urgent_referral_recommended ? (
                                                    <div className="historial-dashboard-warning critical">
                                                        Revisión prioritaria sugerida. Esta alerta no es diagnóstico, pero requiere atención profesional responsable.
                                                    </div>
                                                ) : null}
                                                {[...safetyFlags, ...safetySignals].map((item) => (
                                                    <span className="historial-dashboard-signal-pill" key={item}>{item}</span>
                                                ))}
                                            </div>
                                        ) : null}

                                        {inconsistencyFlags.length > 0 || contextNotes.length > 0 ? (
                                            <div className="historial-dashboard-modal-section">
                                                <h3>Calidad y contexto</h3>
                                                {inconsistencyFlags.map((item) => (
                                                    <div className="historial-dashboard-warning" key={item}>{item}</div>
                                                ))}
                                                {contextNotes.map((item) => (
                                                    <p className="historial-dashboard-helper" key={item}>{item}</p>
                                                ))}
                                            </div>
                                        ) : null}
                                    </>
                                );
                            })()}
                            <div className="historial-dashboard-kv-grid">
                                <div><strong>Estado</strong><span>{getStatusLabel(detailPayload.status)}</span></div>
                                <div><strong>Modo</strong><span>{getModeLabel(detailPayload.mode)}</span></div>
                                <div><strong>Rol</strong><span>{getRoleLabel(detailPayload.role)}</span></div>
                                <div><strong>Actualizado</strong><span>{formatDateTimeEsCO(detailPayload.updated_at)}</span></div>
                            </div>
                            <div className="historial-dashboard-warning">Este resultado es orientativo y no constituye diagnóstico clínico definitivo.</div>
                            <div className="historial-dashboard-modal-section">
                                <h3>Informe orientativo</h3>
                                {clinicalSummaryPayload ? (
                                    <>
                                        <div className="historial-dashboard-kv-grid">
                                            <div><strong>Nivel de alerta</strong><span>{clinicalRisk.label}</span></div>
                                            <div><strong>Generado</strong><span>{formatDateTimeEsCO(clinicalSummaryPayload.generated_at)}</span></div>
                                        </div>
                                        {clinicalComorbiditySummary ? <div className="historial-dashboard-warning"><strong>Posible coexistencia de señales.</strong> {clinicalComorbiditySummary}</div> : null}
                                        <div className="historial-dashboard-kv-grid">{clinicalSections.map((section) => <div key={section.key}><strong>{section.title}</strong><span>{section.content}</span></div>)}</div>
                                    </>
                                ) : <p className="historial-dashboard-helper">No hay informe orientativo disponible.</p>}
                            </div>
                            <div className="historial-dashboard-modal-section">
                                <h3>Resultados por dominio</h3>
                                {resultsPayload?.domains?.length ? (
                                    <div className="historial-dashboard-domain-bars">
                                        {resultsPayload.domains.slice(0, 6).map((domain, index) => {
                                            const label = normalizeDomainLabel(domain.domain_label ?? domain.domain ?? domain.domain_code);
                                            const percent = formatPercentValue(domain.probability ?? domain.confidence_pct);
                                            const width = Math.max(4, Math.min(100, Number(domain.probability) > 1 ? Number(domain.probability) : Number(domain.probability) * 100));
                                            return (
                                                <div className="historial-dashboard-domain-row" key={`${domain.domain ?? label}-${index}`}>
                                                    <div>
                                                        <strong>{label}</strong>
                                                        <span>{percent} · {normalizeAlertLevel(domain.alert_level)}</span>
                                                    </div>
                                                    <div className="historial-dashboard-domain-track" aria-hidden="true">
                                                        <span style={{ width: `${Number.isFinite(width) ? width : 4}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="historial-dashboard-helper">Aún no hay resultados por dominio para este cuestionario.</p>
                                )}
                            </div>
                            <div className="historial-dashboard-modal-section">
                                <h3>Respuestas registradas</h3>
                                {responsesPayload?.items?.length ? (
                                    <div className="historial-dashboard-response-groups">
                                        {groupedResponses(responsesPayload).map((group) => (
                                            <article className="historial-dashboard-response-group" key={group.label}>
                                                <h4>{group.label}</h4>
                                                {group.items.slice(0, 12).map((item, index) => (
                                                    <div className="historial-dashboard-response-row" key={`${group.label}-${index}`}>
                                                        <strong>{responseQuestionText(item)}</strong>
                                                        <span>{responseAnswerText(item)}</span>
                                                    </div>
                                                ))}
                                            </article>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="historial-dashboard-helper">No hay respuestas visibles para este cuestionario con los permisos actuales.</p>
                                )}
                            </div>
                            <div className="historial-dashboard-modal-section">
                                <h3>Resultados estructurados</h3>
                                <KeyValueRows data={toRecord(resultsPayload?.result ?? resultsPayload)} hidden={['id', 'session_id', 'questionnaire_id', 'metadata']} emptyText="Sin resultados complementarios." />
                                <p className="historial-dashboard-helper">{clinicalDisclaimer}</p>
                            </div>
                            <div className="historial-dashboard-modal-section">
                                <h3>Etiquetas</h3>
                                {tags.length === 0 ? (
                                    <p className="historial-dashboard-helper">
                                        Sin etiquetas adicionales. La relación principal con el caso se conserva por asociación directa del cuestionario.
                                    </p>
                                ) : (
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
                            {role === 'padre' ? (
                                <div className="historial-dashboard-modal-section">
                                    <h3>Enviar a psicólogo</h3>
                                    <div className="historial-dashboard-actions-grid historial-dashboard-actions-grid--single">
                                        <article>
                                            <h4>Seleccionar profesional</h4>
                                            <p className="historial-dashboard-helper">
                                                Vas a enviar este cuestionario al psicólogo seleccionado. Si acepta la solicitud, podrá revisar el cuestionario completo y enviarte comentarios orientativos.
                                            </p>
                                            <div className="historial-dashboard-share-toolbar">
                                                <button type="button" className="historial-dashboard-btn secondary" onClick={() => searchPsychologists(true).catch(() => undefined)} disabled={psychologistSearchLoading}>
                                                    Psicólogos recomendados por ubicación
                                                </button>
                                                <form
                                                    className="historial-dashboard-share-search"
                                                    onSubmit={(event) => {
                                                        event.preventDefault();
                                                        searchPsychologists(false).catch(() => undefined);
                                                    }}
                                                >
                                                    <input
                                                        type="search"
                                                        value={psychologistQuery}
                                                        onChange={(event) => setPsychologistQuery(event.target.value)}
                                                        placeholder="Buscar por nombre o username"
                                                    />
                                                    <button type="submit" className="historial-dashboard-btn" disabled={psychologistSearchLoading}>
                                                        {psychologistSearchLoading ? 'Buscando...' : 'Buscar'}
                                                    </button>
                                                </form>
                                            </div>
                                            {psychologistResults.length === 0 ? (
                                                <p className="historial-dashboard-helper">Busca por ubicación o por username para seleccionar un psicólogo.</p>
                                            ) : (
                                                <div className="historial-dashboard-psychologist-list">
                                                    {psychologistResults.map((psychologist) => {
                                                        const fullName = normalizeBackendText(psychologist.full_name ?? psychologist.username, 'Psicólogo registrado');
                                                        const location = normalizeBackendText([psychologist.city, psychologist.department].filter(Boolean).join(' · '), 'Ubicación no disponible');
                                                        return (
                                                            <button
                                                                key={psychologist.user_id}
                                                                type="button"
                                                                className={`historial-dashboard-psychologist-card ${selectedPsychologistId === psychologist.user_id ? 'is-selected' : ''}`}
                                                                onClick={() => setSelectedPsychologistId(psychologist.user_id)}
                                                            >
                                                                <strong>{fullName}</strong>
                                                                <span>{normalizeBackendText(psychologist.username ?? psychologist.email, 'Usuario no disponible')}</span>
                                                                <small>{location}{psychologist.same_city ? ' · Misma ciudad' : psychologist.same_department ? ' · Mismo departamento' : ''}</small>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {shareStatus ? <p className="historial-dashboard-helper">Estado de solicitud: {normalizeRequestStatus(shareStatus)}</p> : null}
                                            <button type="button" className="historial-dashboard-btn" onClick={() => sendToPsychologist().catch(() => undefined)} disabled={!selectedPsychologistId || shareWorking}>
                                                {shareWorking ? 'Enviando...' : 'Enviar a psicólogo'}
                                            </button>
                                        </article>
                                    </div>
                                </div>
                            ) : null}

                            <div className="historial-dashboard-modal-section">
                                <h3>Revisión profesional</h3>
                                {professionalReviews.length === 0 ? (
                                    <div className="historial-dashboard-actions-grid historial-dashboard-actions-grid--single">
                                        <article>
                                            <p className="historial-dashboard-helper">Aún no hay una revisión profesional visible para este cuestionario.</p>
                                            {role === 'padre' ? <p className="historial-dashboard-helper">Puedes enviar este cuestionario a un psicólogo desde la sección anterior.</p> : null}
                                        </article>
                                    </div>
                                ) : (
                                    <div className="historial-dashboard-review-list">
                                        {professionalReviews.map((review) => (
                                            <article className="historial-dashboard-review-card" key={review.review_id}>
                                                <div className="historial-dashboard-card-inline">
                                                    <strong>{normalizeReviewStatus(review.review_status)}</strong>
                                                    <span>{formatDateTimeEsCO(review.updated_at ?? review.created_at)}</span>
                                                </div>
                                                <p><strong>Concepto inicial:</strong> {normalizeBackendText(review.initial_concept, 'Sin concepto registrado')}</p>
                                                <p><strong>Recomendación:</strong> {normalizeBackendText(review.recommendation, 'Sin recomendación registrada')}</p>
                                                <p className="historial-dashboard-helper">Esta revisión es una orientación profesional y no constituye diagnóstico definitivo.</p>
                                            </article>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="historial-dashboard-modal-section">
                                <h3>PDF</h3>
                                <div className="historial-dashboard-actions-grid">
                                    <article>
                                        <h4>Reporte descargable</h4>
                                        <p className="historial-dashboard-helper">
                                            {canDownloadDetailPdf
                                                ? `Estado: ${getString(pdfPayload?.status, 'Sin generar')}`
                                                : 'Disponible cuando el cuestionario esté procesado.'}
                                        </p>
                                        <div className="historial-dashboard-inline-actions">
                                            <button type="button" className="historial-dashboard-btn" onClick={() => downloadPdf(false).catch(() => undefined)} disabled={pdfWorking || !canDownloadDetailPdf}>
                                                {pdfWorking ? 'Preparando PDF...' : 'Descargar PDF'}
                                            </button>
                                            <button type="button" className="historial-dashboard-btn secondary" onClick={() => downloadPdf(true).catch(() => undefined)} disabled={pdfWorking || !canDownloadDetailPdf}>
                                                Regenerar PDF
                                            </button>
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
