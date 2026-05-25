import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../Plataforma.css';
import './SolicitudesRevisionPsicologo.css';
import {
    AreaChart,
    DashboardSection,
    DonutChart,
    HeatmapChart,
    HistogramChart,
    HorizontalBarChart
} from '../../../components/DashboardCharts';
import { Modal } from '../../../components/Modal/Modal';
import {
    acceptPsychologistShareRequestV2,
    getPsychologistShareRequestsV2,
    rejectPsychologistShareRequestV2
} from '../../../services/questionnaires/questionnaires.api';
import type { PsychologistShareRequestDTO } from '../../../services/questionnaires/questionnaires.types';
import {
    buildAgingBuckets,
    buildHeatmapCells,
    buildMonthlyCountItems,
    buildRequestStateItems,
    getDominantDomain,
    mapCountsToItems
} from '../../../utils/dashboard/dashboardData';
import {
    formatDateTime,
    formatPercent,
    normalizeAlertLevel,
    normalizeBackendText,
    normalizeBooleanLabel,
    normalizeDomainLabel,
    normalizeQuestionnaireMode,
    normalizeRequestStatus,
    normalizeSessionStatus,
    safeDisplayText
} from '../../../utils/questionnaires/presentation';
import { emitNotificationsRefresh } from '../../../utils/notifications/events';

const statusOptions = [
    { value: 'pending', label: 'Pendientes' },
    { value: 'accepted', label: 'Aceptadas' },
    { value: 'rejected', label: 'Rechazadas' },
    { value: 'all', label: 'Todas' }
] as const;

type ActionIntent = 'accept' | 'reject' | null;

function resolveRequestTitle(request: PsychologistShareRequestDTO) {
    const casePublicId = normalizeBackendText(request.case?.case_public_id, '');
    if (casePublicId) return `Caso ${casePublicId}`;

    const questionnaireId = normalizeBackendText(request.session?.questionnaire_id, '');
    if (questionnaireId) return `Evaluación ${questionnaireId}`;

    return 'Evaluación sin código público';
}

function resolveRequestMessage(request: PsychologistShareRequestDTO) {
    const responseMessage = safeDisplayText(
        (request as { response_message?: unknown; message?: unknown; grant?: { response_message?: unknown; message?: unknown } | null }).response_message ??
            (request as { response_message?: unknown; message?: unknown; grant?: { response_message?: unknown; message?: unknown } | null }).message ??
            (request as { response_message?: unknown; message?: unknown; grant?: { response_message?: unknown; message?: unknown } | null }).grant?.response_message ??
            (request as { response_message?: unknown; message?: unknown; grant?: { response_message?: unknown; message?: unknown } | null }).grant?.message,
        ''
    );
    if (responseMessage) return responseMessage;
    return 'No se registró un mensaje adicional.';
}

export default function SolicitudesRevisionPsicologo() {
    const location = useLocation();
    const navigate = useNavigate();
    const [status, setStatus] = useState<(typeof statusOptions)[number]['value']>('pending');
    const [query, setQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [requests, setRequests] = useState<PsychologistShareRequestDTO[]>([]);
    const [summary, setSummary] = useState<{ pending_count?: number | null; accepted_count?: number | null; rejected_count?: number | null } | null>(null);
    const [dashboardRequests, setDashboardRequests] = useState<PsychologistShareRequestDTO[]>([]);
    const [dashboardSummary, setDashboardSummary] = useState<{ pending_count?: number | null; accepted_count?: number | null; rejected_count?: number | null } | null>(null);
    const [dashboardSampleTotal, setDashboardSampleTotal] = useState<number | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<PsychologistShareRequestDTO | null>(null);
    const [actionIntent, setActionIntent] = useState<ActionIntent>(null);
    const [actionMessage, setActionMessage] = useState('');
    const [actionWorking, setActionWorking] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const loadRequests = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getPsychologistShareRequestsV2({
                status,
                q: query.trim() || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                page: 1,
                page_size: 20
            });
            setRequests(response.items);
            setSummary(response.summary ?? null);
        } catch (requestError) {
            const payload = typeof requestError === 'object' && requestError && 'payload' in requestError
                ? (requestError as { payload?: { error?: string } }).payload
                : null;
            if (payload?.error === 'psychologist_share_requests_requires_psychologist') {
                setError('Esta vista solo está disponible para psicólogos.');
            } else {
                setError('No fue posible cargar las solicitudes de revisión.');
            }
            setRequests([]);
            setSummary(null);
        } finally {
            setLoading(false);
        }
    }, [dateFrom, dateTo, query, status]);

    useEffect(() => {
        loadRequests().catch(() => undefined);
    }, [loadRequests]);

    useEffect(() => {
        const loadDashboardSample = async () => {
            try {
                const response = await getPsychologistShareRequestsV2({
                    status: 'all',
                    q: query.trim() || undefined,
                    date_from: dateFrom || undefined,
                    date_to: dateTo || undefined,
                    page: 1,
                    page_size: 100
                });
                setDashboardRequests(response.items);
                setDashboardSummary(response.summary ?? null);
                setDashboardSampleTotal(response.pagination?.total ?? response.items.length);
            } catch {
                setDashboardRequests([]);
                setDashboardSummary(null);
                setDashboardSampleTotal(null);
            }
        };

        loadDashboardSample().catch(() => undefined);
    }, [dateFrom, dateTo, query]);

    useEffect(() => {
        const locationState = (location.state ?? {}) as { notificationGrantId?: string; status?: string } | null;
        if (!locationState) return;
        if (locationState.status && status !== locationState.status && statusOptions.some((option) => option.value === locationState.status)) {
            setStatus(locationState.status as (typeof statusOptions)[number]['value']);
            return;
        }
        if (locationState.notificationGrantId) {
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.pathname, location.state, navigate, status]);

    const handleOpenAction = (request: PsychologistShareRequestDTO, intent: ActionIntent) => {
        setSelectedRequest(request);
        setActionIntent(intent);
        setActionMessage(
            intent === 'accept'
                ? 'Acepto revisar el caso.'
                : 'No puedo revisar este caso en este momento.'
        );
        setActionError(null);
    };

    const handleCloseAction = () => {
        if (actionWorking) return;
        setSelectedRequest(null);
        setActionIntent(null);
        setActionMessage('');
        setActionError(null);
    };

    const handleSubmitAction = async () => {
        if (!selectedRequest?.grant_id || !actionIntent) return;
        setActionWorking(true);
        setActionError(null);
        try {
            if (actionIntent === 'accept') {
                await acceptPsychologistShareRequestV2(selectedRequest.grant_id, { message: actionMessage.trim() || undefined });
                setNotice('Solicitud aceptada. La evaluación ahora está disponible en tus evaluaciones recibidas.');
            } else {
                await rejectPsychologistShareRequestV2(selectedRequest.grant_id, { message: actionMessage.trim() || undefined });
                setNotice('Solicitud rechazada.');
            }
            emitNotificationsRefresh({ removeGrantIds: [selectedRequest.grant_id] });
            handleCloseAction();
            await loadRequests();
        } catch {
            setActionError(
                actionIntent === 'accept'
                    ? 'No fue posible aceptar la solicitud.'
                    : 'No fue posible rechazar la solicitud.'
            );
        } finally {
            setActionWorking(false);
        }
    };

    const emptyMessage = useMemo(() => {
        if (status === 'accepted') return 'No tienes solicitudes aceptadas.';
        if (status === 'rejected') return 'No tienes solicitudes rechazadas.';
        if (status === 'all') return 'No hay solicitudes para mostrar.';
        return 'No tienes solicitudes pendientes por revisar.';
    }, [status]);
    const requestsPartialNote = useMemo(
        () =>
            typeof dashboardSampleTotal === 'number' && dashboardSampleTotal > dashboardRequests.length
                ? 'Resumen calculado sobre las solicitudes cargadas.'
                : undefined,
        [dashboardRequests.length, dashboardSampleTotal]
    );
    const requestStateChartItems = useMemo(() => buildRequestStateItems(dashboardSummary), [dashboardSummary]);
    const requestsByAlertChartItems = useMemo(
        () =>
            mapCountsToItems(
                dashboardRequests.reduce((accumulator, request) => {
                    const label = normalizeAlertLevel(request.summary?.highest_alert_level);
                    accumulator.set(label, (accumulator.get(label) ?? 0) + 1);
                    return accumulator;
                }, new Map<string, number>())
            ),
        [dashboardRequests]
    );
    const requestsByDomainChartItems = useMemo(
        () =>
            mapCountsToItems(
                dashboardRequests.reduce((accumulator, request) => {
                    const label = getDominantDomain(request.summary?.domains) ?? 'Sin dominio principal';
                    accumulator.set(label, (accumulator.get(label) ?? 0) + 1);
                    return accumulator;
                }, new Map<string, number>())
            ),
        [dashboardRequests]
    );
    const requestTimelineItems = useMemo(
        () => buildMonthlyCountItems(dashboardRequests.map((request) => request.requested_at ?? null)),
        [dashboardRequests]
    );
    const pendingRequestAging = useMemo(
        () =>
            buildAgingBuckets(
                dashboardRequests
                    .filter((request) => String(request.request_status ?? '').toLowerCase() === 'pending')
                    .map((request) => request.requested_at)
            ),
        [dashboardRequests]
    );
    const heatmapRows = useMemo(() => ['Pendiente', 'Aceptada', 'Rechazada'], []);
    const heatmapColumns = useMemo(() => ['Bajo', 'Moderado', 'Elevado', 'Alto', 'Revisi?n prioritaria'], []);
    const requestHeatmapCells = useMemo(
        () =>
            buildHeatmapCells(
                dashboardRequests,
                heatmapRows,
                heatmapColumns,
                (request) => normalizeRequestStatus(request.request_status),
                (request) => normalizeAlertLevel(request.summary?.highest_alert_level)
            ),
        [dashboardRequests, heatmapColumns, heatmapRows]
    );

    return (
        <div className="plataforma-view">
            <section className="solicitudes-revision" aria-label="Solicitudes de revisión">
                <div className="solicitudes-revision__header">
                    <div>
                        <h1>Solicitudes de revisión</h1>
                        <p>Administra las solicitudes pendientes antes de que las evaluaciones aparezcan en tus evaluaciones recibidas.</p>
                    </div>
                    <button type="button" onClick={() => loadRequests().catch(() => undefined)}>
                        Actualizar
                    </button>
                </div>

                <div className="solicitudes-revision__filters">
                    <div className="solicitudes-revision__status-tabs" role="tablist" aria-label="Filtrar solicitudes por estado">
                        {statusOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`solicitudes-revision__status-tab ${status === option.value ? 'is-active' : ''}`}
                                onClick={() => setStatus(option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar por caso o acudiente"
                    />
                    <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
                    <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
                </div>

                {notice ? <div className="solicitudes-revision__notice success">{notice}</div> : null}
                {error ? <div className="solicitudes-revision__notice error">{error}</div> : null}

                {summary ? (
                    <div className="solicitudes-revision__summary">
                        <article><strong>Pendientes</strong><span>{summary.pending_count ?? 0}</span></article>
                        <article><strong>Aceptadas</strong><span>{summary.accepted_count ?? 0}</span></article>
                        <article><strong>Rechazadas</strong><span>{summary.rejected_count ?? 0}</span></article>
                    </div>
                ) : null}

                {!loading ? (
                    <div className="solicitudes-revision__dashboard-grid">
                        <DashboardSection
                            title="Estado de solicitudes"
                            description="Resume el estado general de las solicitudes recibidas."
                            note={requestsPartialNote}
                        >
                            <DonutChart
                                data={requestStateChartItems}
                                ariaLabel="Distribución de solicitudes por estado"
                                emptyMessage="No hay datos suficientes para generar esta gráfica en el periodo seleccionado."
                            />
                        </DashboardSection>
                        <DashboardSection
                            title="Solicitudes por nivel de alerta"
                            description="Permite identificar solicitudes que pueden requerir atención prioritaria."
                            note={requestsPartialNote}
                        >
                            <HorizontalBarChart
                                data={requestsByAlertChartItems}
                                ariaLabel="Solicitudes por nivel de alerta"
                                emptyMessage="No hay datos suficientes para generar esta gráfica en el periodo seleccionado."
                            />
                        </DashboardSection>
                        <DashboardSection
                            title="Solicitudes por dominio principal"
                            description="Muestra los dominios predominantes en las solicitudes recibidas."
                            note={requestsPartialNote}
                        >
                            <DonutChart
                                data={requestsByDomainChartItems}
                                ariaLabel="Solicitudes por dominio principal"
                                emptyMessage="No hay datos suficientes para generar esta gráfica en el periodo seleccionado."
                            />
                        </DashboardSection>
                        <DashboardSection
                            title="Solicitudes recibidas en el tiempo"
                            description="Permite observar la carga de solicitudes recibidas en el tiempo."
                            note={requestsPartialNote}
                        >
                            <AreaChart
                                data={requestTimelineItems}
                                ariaLabel="Solicitudes recibidas a lo largo del tiempo"
                                emptyMessage="No hay datos suficientes para generar esta gráfica en el periodo seleccionado."
                            />
                        </DashboardSection>
                        <DashboardSection
                            title="Antigüedad de solicitudes pendientes"
                            description="Identifica solicitudes pendientes que llevan más tiempo sin respuesta."
                            note={requestsPartialNote}
                        >
                            <HistogramChart
                                data={pendingRequestAging}
                                ariaLabel="Antigüedad de solicitudes pendientes"
                                emptyMessage="No hay datos suficientes para generar esta gráfica en el periodo seleccionado."
                            />
                        </DashboardSection>
                        <DashboardSection
                            title="Matriz de prioridad de solicitudes"
                            description="Cruza estado y alerta para ubicar solicitudes pendientes de mayor prioridad."
                            note={requestsPartialNote}
                        >
                            <HeatmapChart
                                rows={heatmapRows}
                                columns={heatmapColumns}
                                cells={requestHeatmapCells}
                                ariaLabel="Cruce entre estado de solicitud y nivel de alerta"
                                emptyMessage="No hay datos suficientes para generar esta gráfica en el periodo seleccionado."
                            />
                        </DashboardSection>
                    </div>
                ) : null}

                {loading ? <div className="solicitudes-revision__empty">Cargando solicitudes...</div> : null}
                {!loading && requests.length === 0 ? <div className="solicitudes-revision__empty">{emptyMessage}</div> : null}

                {!loading && requests.length > 0 ? (
                    <div className="solicitudes-revision__list">
                        {requests.map((request) => (
                            <article key={request.grant_id} className="solicitudes-revision__card">
                                <div className="solicitudes-revision__card-top">
                                    <div>
                                        <h2>{resolveRequestTitle(request)}</h2>
                                        <p>{normalizeBackendText(request.guardian?.display_name, 'Acudiente no disponible')}</p>
                                    </div>
                                    <span>{normalizeRequestStatus(request.request_status)}</span>
                                </div>

                                <div className="solicitudes-revision__meta">
                                    <div>
                                        <strong>Sesión</strong>
                                        <span>{normalizeBackendText(request.session?.questionnaire_id ?? request.session?.session_id, '--')}</span>
                                    </div>
                                    <div>
                                        <strong>Estado</strong>
                                        <span>{normalizeSessionStatus(request.session?.status)}</span>
                                    </div>
                                    <div>
                                        <strong>Modo</strong>
                                        <span>{normalizeQuestionnaireMode(request.session?.mode)}</span>
                                    </div>
                                    <div>
                                        <strong>Solicitada</strong>
                                        <span>{formatDateTime(request.requested_at)}</span>
                                    </div>
                                    <div>
                                        <strong>Respondida</strong>
                                        <span>{formatDateTime(request.responded_at)}</span>
                                    </div>
                                    <div>
                                        <strong>Progreso</strong>
                                        <span>{formatPercent(request.session?.progress_pct)}</span>
                                    </div>
                                </div>

                                {request.summary ? (
                                    <div className="solicitudes-revision__summary-block">
                                        <p className="solicitudes-revision__protected-text">
                                            {safeDisplayText(
                                                request.summary.result_summary,
                                                'Resumen protegido no disponible para visualización.'
                                            )}
                                        </p>
                                        <p>
                                            <strong>Mayor alerta:</strong> {normalizeAlertLevel(request.summary.highest_alert_level)}
                                            {' · '}
                                            <strong>Requiere revisión:</strong> {normalizeBooleanLabel(request.summary.needs_professional_review)}
                                        </p>
                                        {Array.isArray(request.summary.domains) && request.summary.domains.length > 0 ? (
                                            <div className="solicitudes-revision__domains">
                                                {request.summary.domains.map((domainItem, index) => (
                                                    <div key={`${request.grant_id}-${domainItem.domain ?? index}`} className="solicitudes-revision__domain-pill">
                                                        <strong>{normalizeDomainLabel(domainItem.domain)}</strong>
                                                        <span>{formatPercent(domainItem.probability)}</span>
                                                        <small>{normalizeAlertLevel(domainItem.alert_level)}</small>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}

                                {request.request_status !== 'pending' ? (
                                    <div className="solicitudes-revision__summary-block">
                                        <p>
                                            <strong>Respuesta del psicólogo</strong>
                                        </p>
                                        <p>
                                            <strong>Estado:</strong> {normalizeRequestStatus(request.request_status)}
                                            {' · '}
                                            <strong>Respondida:</strong> {formatDateTime(request.responded_at)}
                                        </p>
                                        <p className="solicitudes-revision__protected-text">
                                            <strong>{request.request_status === 'rejected' ? 'Motivo:' : 'Mensaje:'}</strong>{' '}
                                            {resolveRequestMessage(request)}
                                        </p>
                                    </div>
                                ) : null}

                                <div className="solicitudes-revision__actions">
                                    {request.request_status === 'pending' ? (
                                        <>
                                            <button
                                                type="button"
                                                disabled={!request.can_accept}
                                                onClick={() => handleOpenAction(request, 'accept')}
                                            >
                                                Aceptar
                                            </button>
                                            <button
                                                type="button"
                                                disabled={!request.can_reject}
                                                onClick={() => handleOpenAction(request, 'reject')}
                                            >
                                                Rechazar
                                            </button>
                                        </>
                                    ) : null}
                                    {request.request_status === 'accepted' && request.session?.session_id ? (
                                        <button
                                            type="button"
                                            onClick={() => navigate('/psicologo/evaluaciones', { state: { openEvaluationSessionId: request.session?.session_id } })}
                                        >
                                            Ver evaluación
                                        </button>
                                    ) : null}
                                </div>
                            </article>
                        ))}
                    </div>
                ) : null}
            </section>

            <Modal isOpen={selectedRequest !== null && actionIntent !== null} onClose={handleCloseAction}>
                <div className="solicitudes-revision__modal">
                    <h2>{actionIntent === 'accept' ? 'Aceptar solicitud' : 'Rechazar solicitud'}</h2>
                    <p>
                        {actionIntent === 'accept'
                            ? 'Puedes dejar un mensaje opcional para confirmar la revisión del caso.'
                            : 'Confirma si deseas rechazar esta solicitud. Puedes dejar un mensaje opcional.'}
                    </p>
                    <textarea
                        value={actionMessage}
                        onChange={(event) => setActionMessage(event.target.value)}
                        placeholder={actionIntent === 'accept' ? 'Acepto revisar el caso.' : 'No puedo revisar este caso en este momento.'}
                    />
                    {actionError ? <div className="solicitudes-revision__notice error">{actionError}</div> : null}
                    <div className="solicitudes-revision__modal-actions">
                        <button type="button" onClick={handleCloseAction} disabled={actionWorking}>Cancelar</button>
                        <button type="button" onClick={() => { handleSubmitAction().catch(() => undefined); }} disabled={actionWorking}>
                            {actionWorking ? 'Procesando...' : actionIntent === 'accept' ? 'Aceptar' : 'Rechazar'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
