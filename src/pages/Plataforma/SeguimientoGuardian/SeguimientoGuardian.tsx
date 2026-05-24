import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../Plataforma.css';
import './SeguimientoGuardian.css';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { Modal } from '../../../components/Modal/Modal';
import {
    createQuestionnaireCaseV2,
    getGuardianQuestionnaireDashboardV2,
    getQuestionnaireCaseDetailV2,
    getQuestionnaireCasesV2
} from '../../../services/questionnaires/questionnaires.api';
import type {
    GuardianDashboardCaseDTO,
    GuardianDashboardDTO,
    QuestionnaireCaseDTO,
    QuestionnaireCaseDetailDTO,
    QuestionnaireCaseDomainSummaryDTO,
    QuestionnaireSessionV2DTO
} from '../../../services/questionnaires/questionnaires.types';
import {
    formatDateTime,
    formatPercent,
    normalizeAlertLevel,
    normalizeCaseStatus,
    normalizeDomainLabel,
    normalizeQuestionnaireMode,
    normalizeSessionStatus
} from '../../../utils/questionnaires/presentation';

const periodOptions = [
    { value: '3', label: 'Últimos 3 meses' },
    { value: '6', label: 'Últimos 6 meses' },
    { value: '12', label: 'Últimos 12 meses' }
];

const CREATE_CASE_MAX_LENGTH = 120;

function getCaseOptionLabel(item: QuestionnaireCaseDTO) {
    const label = item.display_label ?? item.private_label ?? 'Caso sin etiqueta';
    const publicId = item.case_public_id ? ` · ${item.case_public_id}` : '';
    return `${label}${publicId}`;
}

function resolveCaseLabel(item: QuestionnaireCaseDTO | null | undefined) {
    return item?.display_label ?? item?.private_label ?? item?.case_public_id ?? 'Caso sin etiqueta';
}

function validateCaseLabel(value: string) {
    const trimmed = value.trim();
    if (trimmed.length === 0) return 'Ingresa una etiqueta para el caso.';
    if (trimmed.length < 2) return 'La etiqueta del caso debe tener al menos 2 caracteres.';
    if (trimmed.length > CREATE_CASE_MAX_LENGTH) return `La etiqueta del caso no puede superar los ${CREATE_CASE_MAX_LENGTH} caracteres.`;
    return null;
}

function parseSortableDate(...candidates: Array<string | null | undefined>) {
    for (const candidate of candidates) {
        if (!candidate) continue;
        const parsed = Date.parse(candidate);
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
}

function resolveSessionKey(session: QuestionnaireSessionV2DTO) {
    return session.session_id ?? session.id;
}

function sortCaseSessions(sessions: QuestionnaireSessionV2DTO[]) {
    return [...sessions].sort(
        (left, right) =>
            parseSortableDate(right.processed_at, right.updated_at, right.created_at) -
            parseSortableDate(left.processed_at, left.updated_at, left.created_at)
    );
}

function resolveSessionAlert(session: QuestionnaireSessionV2DTO) {
    const domains = Array.isArray(session.domains) ? session.domains : [];
    if (domains.length === 0) return null;

    const topDomain = [...domains].sort(
        (left, right) => (Number(right.probability ?? -1) || -1) - (Number(left.probability ?? -1) || -1)
    )[0];

    if (!topDomain) return null;
    return {
        domainLabel: normalizeDomainLabel(topDomain.domain),
        alertLabel: normalizeAlertLevel(topDomain.alert_level),
        probabilityLabel: formatPercent(topDomain.probability)
    };
}

function isSessionProcessed(session: QuestionnaireSessionV2DTO) {
    return (session.status ?? '').trim().toLowerCase() === 'processed';
}

function getDashboardEntryMap(entries: GuardianDashboardCaseDTO[]) {
    return new Map(
        entries
            .map((entry) => [entry.case?.case_id ?? '', entry] as const)
            .filter(([nextCaseId]) => nextCaseId.length > 0)
    );
}

function hasPeakProbability(domains: QuestionnaireCaseDomainSummaryDTO[]) {
    return domains.some((domain) => typeof domain.max_probability === 'number');
}

export default function SeguimientoGuardian() {
    const navigate = useNavigate();
    const [months, setMonths] = useState('3');
    const [caseId, setCaseId] = useState('');
    const [dashboard, setDashboard] = useState<GuardianDashboardDTO | null>(null);
    const [cases, setCases] = useState<QuestionnaireCaseDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [createCaseModalOpen, setCreateCaseModalOpen] = useState(false);
    const [createCaseLabel, setCreateCaseLabel] = useState('');
    const [createCaseWorking, setCreateCaseWorking] = useState(false);
    const [createCaseError, setCreateCaseError] = useState<string | null>(null);
    const [createCaseNotice, setCreateCaseNotice] = useState<string | null>(null);

    const [caseDetailsById, setCaseDetailsById] = useState<Record<string, QuestionnaireCaseDetailDTO>>({});
    const [caseLoadingById, setCaseLoadingById] = useState<Record<string, boolean>>({});
    const [caseErrorById, setCaseErrorById] = useState<Record<string, string | null>>({});
    const [expandedSessionByCaseId, setExpandedSessionByCaseId] = useState<Record<string, string>>({});

    const caseOptions = useMemo(
        () => [
            { value: '', label: 'Todos los casos' },
            ...cases.map((item) => ({ value: item.case_id, label: getCaseOptionLabel(item) }))
        ],
        [cases]
    );

    const dashboardEntryMap = useMemo(() => getDashboardEntryMap(dashboard?.cases ?? []), [dashboard?.cases]);

    const visibleCases = useMemo(() => {
        const filtered = caseId ? cases.filter((item) => item.case_id === caseId) : cases;
        return [...filtered].sort(
            (left, right) => parseSortableDate(right.updated_at, right.created_at) - parseSortableDate(left.updated_at, left.created_at)
        );
    }, [caseId, cases]);

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [casesResponse, dashboardResponse] = await Promise.all([
                getQuestionnaireCasesV2({ status: 'active', page: 1, page_size: 50 }),
                getGuardianQuestionnaireDashboardV2({
                    months: Number(months),
                    ...(caseId ? { case_id: caseId } : {})
                })
            ]);
            setCases(casesResponse.items);
            setDashboard(dashboardResponse);
        } catch {
            setError('No fue posible cargar los casos. Intenta nuevamente.');
            setCases([]);
            setDashboard(null);
        } finally {
            setLoading(false);
        }
    }, [caseId, months]);

    const loadCaseDetail = useCallback(
        async (nextCaseId: string, force = false) => {
            if (!nextCaseId) return;
            if (!force && (caseDetailsById[nextCaseId] || caseLoadingById[nextCaseId])) return;

            setCaseLoadingById((prev) => ({ ...prev, [nextCaseId]: true }));
            setCaseErrorById((prev) => ({ ...prev, [nextCaseId]: null }));
            try {
                const detail = await getQuestionnaireCaseDetailV2(nextCaseId);
                const sortedSessions = sortCaseSessions(detail.sessions ?? []);
                setCaseDetailsById((prev) => ({ ...prev, [nextCaseId]: { ...detail, sessions: sortedSessions } }));
                setExpandedSessionByCaseId((prev) => {
                    if (prev[nextCaseId] || sortedSessions.length === 0) return prev;
                    return { ...prev, [nextCaseId]: resolveSessionKey(sortedSessions[0]) };
                });
            } catch {
                setCaseErrorById((prev) => ({ ...prev, [nextCaseId]: 'No fue posible cargar las sesiones de este caso.' }));
            } finally {
                setCaseLoadingById((prev) => ({ ...prev, [nextCaseId]: false }));
            }
        },
        [caseDetailsById, caseLoadingById]
    );

    useEffect(() => {
        loadDashboard().catch(() => undefined);
    }, [loadDashboard]);

    useEffect(() => {
        visibleCases.forEach((item) => {
            if (item.case_id) {
                loadCaseDetail(item.case_id).catch(() => undefined);
            }
        });
    }, [loadCaseDetail, visibleCases]);

    const summary = dashboard?.summary ?? null;
    const hasCases = cases.length > 0;
    const createCaseLabelError = validateCaseLabel(createCaseLabel);

    const openCreateCaseModal = () => {
        setCreateCaseError(null);
        setCreateCaseLabel('');
        setCreateCaseModalOpen(true);
    };

    const closeCreateCaseModal = () => {
        if (createCaseWorking) return;
        setCreateCaseModalOpen(false);
        setCreateCaseError(null);
        setCreateCaseLabel('');
    };

    const handleCreateCase = async () => {
        const validationError = validateCaseLabel(createCaseLabel);
        if (validationError) {
            setCreateCaseError(validationError);
            return;
        }

        setCreateCaseWorking(true);
        setCreateCaseError(null);
        setCreateCaseNotice(null);
        try {
            const createdCase = await createQuestionnaireCaseV2({
                private_label: createCaseLabel.trim(),
                metadata: {}
            });
            setCreateCaseModalOpen(false);
            setCreateCaseLabel('');
            setCreateCaseNotice(`El caso "${resolveCaseLabel(createdCase)}" se creó correctamente.`);
            const [casesResponse, dashboardResponse] = await Promise.all([
                getQuestionnaireCasesV2({ status: 'active', page: 1, page_size: 50 }),
                getGuardianQuestionnaireDashboardV2({ months: Number(months) })
            ]);
            setCaseId('');
            setCases(casesResponse.items);
            setDashboard(dashboardResponse);
        } catch {
            setCreateCaseError('No fue posible crear el caso. Intenta nuevamente.');
        } finally {
            setCreateCaseWorking(false);
        }
    };

    const handleOpenHistoryReport = useCallback(
        (session: QuestionnaireSessionV2DTO) => {
            const sessionId = resolveSessionKey(session);
            if (!sessionId) return;

            navigate('/padre/historial', {
                state: {
                    openHistorySessionId: sessionId
                }
            });
        },
        [navigate]
    );

    return (
        <div className="plataforma-view">
            <section className="seguimiento-guardian" aria-label="Casos y seguimiento">
                <div className="seguimiento-header">
                    <div>
                        <h1>Casos</h1>
                        <p>
                            Un caso permite agrupar cuestionarios relacionados con una misma persona o situación para facilitar el seguimiento en el tiempo.
                        </p>
                    </div>
                    <div className="seguimiento-header-actions">
                        <div className="seguimiento-filters">
                            <label>
                                Periodo
                                <CustomSelect
                                    value={months}
                                    options={periodOptions}
                                    onChange={setMonths}
                                    ariaLabel="Filtrar casos por periodo"
                                />
                            </label>
                            {cases.length > 0 ? (
                                <label>
                                    Caso
                                    <CustomSelect
                                        value={caseId}
                                        options={caseOptions}
                                        onChange={setCaseId}
                                        ariaLabel="Filtrar por caso"
                                    />
                                </label>
                            ) : null}
                        </div>
                        <button type="button" className="seguimiento-create-btn" onClick={openCreateCaseModal}>
                            Crear caso
                        </button>
                    </div>
                </div>

                {createCaseNotice ? <div className="seguimiento-alert success">{createCaseNotice}</div> : null}
                {error ? <div className="seguimiento-alert error">{error}</div> : null}

                {loading ? <div className="seguimiento-empty">Cargando casos...</div> : null}

                {!loading && !hasCases ? (
                    <div className="seguimiento-empty-card">
                        <h2>Aún no tienes casos creados.</h2>
                        <p>Cuando inicies un cuestionario podrás crear un caso para agrupar seguimientos.</p>
                    </div>
                ) : null}

                {!loading && hasCases ? (
                    <>
                        <div className="seguimiento-summary-grid">
                            <article className="seguimiento-summary-card">
                                <strong>Total de casos</strong>
                                <span>{summary?.total_cases ?? cases.length}</span>
                            </article>
                            <article className="seguimiento-summary-card">
                                <strong>Total de sesiones</strong>
                                <span>{summary?.total_sessions ?? 0}</span>
                            </article>
                            <article className="seguimiento-summary-card">
                                <strong>Sesiones procesadas</strong>
                                <span>{summary?.processed_sessions ?? 0}</span>
                            </article>
                            <article className="seguimiento-summary-card">
                                <strong>Casos con revisión profesional</strong>
                                <span>{summary?.cases_needing_professional_review ?? 0}</span>
                            </article>
                            <article className="seguimiento-summary-card">
                                <strong>Mayor nivel de alerta</strong>
                                <span>{normalizeAlertLevel(summary?.highest_alert_level)}</span>
                            </article>
                        </div>

                        <div className="seguimiento-case-list">
                            {visibleCases.map((caseItem) => {
                                const caseEntry = dashboardEntryMap.get(caseItem.case_id) ?? null;
                                const caseDetail = caseDetailsById[caseItem.case_id] ?? null;
                                const caseSessions = sortCaseSessions(caseDetail?.sessions ?? []);
                                const expandedSessionId =
                                    expandedSessionByCaseId[caseItem.case_id] ?? (caseSessions[0] ? resolveSessionKey(caseSessions[0]) : '');
                                const caseIsLoading = caseLoadingById[caseItem.case_id] === true;
                                const caseLoadError = caseErrorById[caseItem.case_id] ?? null;
                                const domainBreakdown = caseEntry?.domain_breakdown ?? [];
                                const showPeakProbability = hasPeakProbability(domainBreakdown);

                                return (
                                    <article key={caseItem.case_id} className="seguimiento-case-card">
                                        <div className="seguimiento-case-top">
                                            <div>
                                                <h2>{resolveCaseLabel(caseItem)}</h2>
                                                <p>{caseItem.case_public_id ?? 'Sin código público disponible'}</p>
                                            </div>
                                            <span className="seguimiento-case-badge">
                                                {caseItem.sessions_count ?? caseEntry?.sessions_count ?? caseSessions.length}{' '}
                                                {(caseItem.sessions_count ?? caseEntry?.sessions_count ?? caseSessions.length) === 1 ? 'sesión' : 'sesiones'}
                                            </span>
                                        </div>

                                        <div className="seguimiento-case-meta">
                                            <div>
                                                <strong>Estado del caso</strong>
                                                <span>{normalizeCaseStatus(caseItem.status)}</span>
                                            </div>
                                            <div>
                                                <strong>Último procesamiento</strong>
                                                <span>{formatDateTime(caseItem.latest_processed_at ?? caseEntry?.latest_session?.processed_at)}</span>
                                            </div>
                                            <div>
                                                <strong>Alerta principal</strong>
                                                <span>{normalizeAlertLevel(caseItem.latest_alert_level ?? caseEntry?.domain_breakdown?.[0]?.latest_alert_level)}</span>
                                            </div>
                                        </div>

                                        <div className="seguimiento-domain-list">
                                            <h3>Última medición por dominio</h3>
                                            <p>
                                                Estos valores corresponden a la última sesión del caso dentro del periodo seleccionado. No representan un promedio histórico.
                                            </p>
                                            {domainBreakdown.length > 0 ? (
                                                <div className="seguimiento-domain-table">
                                                    <div className={`seguimiento-domain-row seguimiento-domain-head ${showPeakProbability ? 'has-peak' : ''}`}>
                                                        <strong>Dominio</strong>
                                                        <strong>Última medición</strong>
                                                        {showPeakProbability ? <strong>Mayor registrada</strong> : null}
                                                        <strong>Alerta actual</strong>
                                                    </div>
                                                    {domainBreakdown.map((domain) => (
                                                        <div
                                                            key={`${caseItem.case_id}-${domain.domain}`}
                                                            className={`seguimiento-domain-row ${showPeakProbability ? 'has-peak' : ''}`}
                                                        >
                                                            <span className="seguimiento-domain-cell heading">{normalizeDomainLabel(domain.domain)}</span>
                                                            <span className="seguimiento-domain-cell">{formatPercent(domain.latest_probability)}</span>
                                                            {showPeakProbability ? (
                                                                <span className="seguimiento-domain-cell">
                                                                    {typeof domain.max_probability === 'number' ? formatPercent(domain.max_probability) : '—'}
                                                                </span>
                                                            ) : null}
                                                            <span className="seguimiento-domain-cell">{normalizeAlertLevel(domain.latest_alert_level)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p>No hay mediciones de dominio disponibles para este periodo.</p>
                                            )}
                                        </div>

                                        <div className="seguimiento-sessions">
                                            <div className="seguimiento-sessions-header">
                                                <h3>Sesiones del caso</h3>
                                                {caseLoadError ? (
                                                    <button
                                                        type="button"
                                                        className="seguimiento-inline-btn"
                                                        onClick={() => loadCaseDetail(caseItem.case_id, true).catch(() => undefined)}
                                                    >
                                                        Reintentar
                                                    </button>
                                                ) : null}
                                            </div>

                                            {caseIsLoading ? <p className="seguimiento-session-empty">Cargando sesiones del caso...</p> : null}
                                            {!caseIsLoading && caseLoadError ? <p className="seguimiento-session-empty error">{caseLoadError}</p> : null}
                                            {!caseIsLoading && !caseLoadError && caseSessions.length === 0 ? (
                                                <p className="seguimiento-session-empty">Este caso aún no tiene cuestionarios asociados.</p>
                                            ) : null}

                                            {!caseIsLoading && !caseLoadError && caseSessions.length > 0 ? (
                                                <div className="seguimiento-session-list">
                                                    {caseSessions.map((session) => {
                                                        const sessionKey = resolveSessionKey(session);
                                                        const isExpanded = expandedSessionId === sessionKey;
                                                        const sessionAlert = resolveSessionAlert(session);

                                                        return (
                                                            <div key={sessionKey} className={`seguimiento-session-card ${isExpanded ? 'is-expanded' : ''}`}>
                                                                <button
                                                                    type="button"
                                                                    className="seguimiento-session-summary"
                                                                    onClick={() => setExpandedSessionByCaseId((prev) => ({ ...prev, [caseItem.case_id]: sessionKey }))}
                                                                    aria-expanded={isExpanded}
                                                                >
                                                                    <span>{formatDateTime(session.processed_at ?? session.updated_at ?? session.created_at)}</span>
                                                                    <span>{normalizeSessionStatus(session.status)}</span>
                                                                    <span>{normalizeQuestionnaireMode(session.mode)}</span>
                                                                    <span>{sessionAlert ? `${sessionAlert.domainLabel} · ${sessionAlert.alertLabel}` : 'Sin alerta visible'}</span>
                                                                </button>

                                                                <div className="seguimiento-session-details" aria-hidden={!isExpanded}>
                                                                    <div className="seguimiento-session-details-inner">
                                                                        <div className="seguimiento-session-grid">
                                                                            <div>
                                                                                <strong>Estado</strong>
                                                                                <span>{normalizeSessionStatus(session.status)}</span>
                                                                            </div>
                                                                            <div>
                                                                                <strong>Creada</strong>
                                                                                <span>{formatDateTime(session.created_at)}</span>
                                                                            </div>
                                                                            <div>
                                                                                <strong>Procesada</strong>
                                                                                <span>{formatDateTime(session.processed_at)}</span>
                                                                            </div>
                                                                            <div>
                                                                                <strong>Modo</strong>
                                                                                <span>{normalizeQuestionnaireMode(session.mode)}</span>
                                                                            </div>
                                                                            <div>
                                                                                <strong>Progreso</strong>
                                                                                <span>{formatPercent(session.progress_percent ?? session.progress_pct)}</span>
                                                                            </div>
                                                                            <div>
                                                                                <strong>Revisión profesional</strong>
                                                                                <span>{session.result?.needs_professional_review ? 'Sí' : 'No'}</span>
                                                                            </div>
                                                                        </div>

                                                                        {sessionAlert ? (
                                                                            <p className="seguimiento-session-alert">
                                                                                Alerta principal: {sessionAlert.domainLabel} · {sessionAlert.alertLabel} · {sessionAlert.probabilityLabel}
                                                                            </p>
                                                                        ) : null}

                                                                        {Array.isArray(session.domains) && session.domains.length > 0 ? (
                                                                            <div className="seguimiento-session-domains">
                                                                                {session.domains.map((domain) => (
                                                                                    <div key={`${sessionKey}-${domain.domain}`} className="seguimiento-domain-pill">
                                                                                        <strong>{normalizeDomainLabel(domain.domain)}</strong>
                                                                                        <span>{formatPercent(domain.probability)}</span>
                                                                                        <small>{normalizeAlertLevel(domain.alert_level)}</small>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        ) : null}

                                                                        <div className="seguimiento-session-actions">
                                                                            <button
                                                                                type="button"
                                                                                className="seguimiento-inline-btn"
                                                                                onClick={() => handleOpenHistoryReport(session)}
                                                                                disabled={!isSessionProcessed(session)}
                                                                                title={isSessionProcessed(session) ? 'Ver reporte de sesión' : 'Reporte disponible cuando la sesión esté procesada.'}
                                                                            >
                                                                                Ver reporte
                                                                            </button>
                                                                            {!isSessionProcessed(session) ? (
                                                                                <span className="seguimiento-session-hint">Reporte disponible cuando la sesión esté procesada.</span>
                                                                            ) : null}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : null}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </>
                ) : null}
            </section>

            <Modal isOpen={createCaseModalOpen} onClose={closeCreateCaseModal}>
                <div className="seguimiento-case-modal">
                    <h2>Crear caso</h2>
                    <p className="seguimiento-case-modal-description">
                        Un caso permite agrupar cuestionarios relacionados con una misma persona o situación para facilitar el seguimiento en el tiempo.
                    </p>
                    <label className="seguimiento-case-field">
                        <span>Etiqueta del caso</span>
                        <input
                            type="text"
                            value={createCaseLabel}
                            onChange={(event) => {
                                setCreateCaseLabel(event.target.value);
                                setCreateCaseError(null);
                            }}
                            placeholder="Ej. Hijo mayor, Seguimiento escolar, Caso ansiedad"
                            maxLength={CREATE_CASE_MAX_LENGTH}
                        />
                    </label>
                    {createCaseLabelError && createCaseLabel.trim().length > 0 ? (
                        <p className="seguimiento-case-helper error">{createCaseLabelError}</p>
                    ) : null}
                    {createCaseError ? <div className="seguimiento-alert error">{createCaseError}</div> : null}
                    <div className="seguimiento-case-actions">
                        <button type="button" className="seguimiento-inline-btn ghost" onClick={closeCreateCaseModal} disabled={createCaseWorking}>
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="seguimiento-create-btn"
                            onClick={() => handleCreateCase().catch(() => undefined)}
                            disabled={createCaseWorking || createCaseLabelError !== null}
                        >
                            {createCaseWorking ? 'Guardando...' : 'Crear caso'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
