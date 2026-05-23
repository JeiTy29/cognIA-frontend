import { useCallback, useEffect, useMemo, useState } from 'react';
import '../Plataforma.css';
import './SeguimientoGuardian.css';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import {
    getGuardianQuestionnaireDashboardV2,
    getQuestionnaireCasesV2
} from '../../../services/questionnaires/questionnaires.api';
import type {
    GuardianDashboardDTO,
    QuestionnaireCaseDTO
} from '../../../services/questionnaires/questionnaires.types';
import {
    formatDateTime,
    formatPercent,
    normalizeAlertLevel,
    normalizeDomainLabel,
    normalizeSessionStatus
} from '../../../utils/questionnaires/presentation';

const periodOptions = [
    { value: '3', label: 'Últimos 3 meses' },
    { value: '6', label: 'Últimos 6 meses' },
    { value: '12', label: 'Últimos 12 meses' }
];

function getCaseOptionLabel(item: QuestionnaireCaseDTO) {
    const label = item.display_label ?? item.private_label ?? 'Caso sin etiqueta';
    const publicId = item.case_public_id ? ` · ${item.case_public_id}` : '';
    return `${label}${publicId}`;
}

export default function SeguimientoGuardian() {
    const [months, setMonths] = useState('3');
    const [caseId, setCaseId] = useState('');
    const [dashboard, setDashboard] = useState<GuardianDashboardDTO | null>(null);
    const [cases, setCases] = useState<QuestionnaireCaseDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const caseOptions = useMemo(
        () => [{ value: '', label: 'Todos los casos' }, ...cases.map((item) => ({ value: item.case_id, label: getCaseOptionLabel(item) }))],
        [cases]
    );

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
            setError('No fue posible cargar el seguimiento de casos. Intenta nuevamente.');
            setDashboard(null);
        } finally {
            setLoading(false);
        }
    }, [caseId, months]);

    useEffect(() => {
        loadDashboard().catch(() => undefined);
    }, [loadDashboard]);

    const summary = dashboard?.summary ?? null;
    const dashboardCases = dashboard?.cases ?? [];
    const hasCases = (summary?.total_cases ?? 0) > 0 || cases.length > 0 || dashboardCases.length > 0;

    return (
        <div className="plataforma-view">
            <section className="seguimiento-guardian" aria-label="Seguimiento de casos">
                <div className="seguimiento-header">
                    <div>
                        <h1>Mis casos</h1>
                        <p>
                            Consulta la evolución reciente de tus cuestionarios agrupados por caso y detecta si alguna sesión requiere revisión profesional.
                        </p>
                    </div>
                    <div className="seguimiento-filters">
                        <label>
                            Periodo
                            <CustomSelect
                                value={months}
                                options={periodOptions}
                                onChange={setMonths}
                                ariaLabel="Filtrar seguimiento por periodo"
                            />
                        </label>
                        {cases.length > 0 ? (
                            <label>
                                Caso
                                <CustomSelect
                                    value={caseId}
                                    options={caseOptions}
                                    onChange={setCaseId}
                                    ariaLabel="Filtrar seguimiento por caso"
                                />
                            </label>
                        ) : null}
                    </div>
                </div>

                {error ? <div className="seguimiento-alert error">{error}</div> : null}

                {loading ? <div className="seguimiento-empty">Cargando seguimiento...</div> : null}

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
                                <span>{summary?.total_cases ?? 0}</span>
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
                            {dashboardCases.length === 0 ? (
                                <div className="seguimiento-empty-card">
                                    <h2>Sin actividad en el periodo seleccionado</h2>
                                    <p>Los casos existen, pero no registran sesiones relevantes para este rango de fechas.</p>
                                </div>
                            ) : (
                                dashboardCases.map((entry) => {
                                    const caseData = entry.case;
                                    const latestSession = entry.latest_session;
                                    return (
                                        <article key={caseData?.case_id ?? Math.random()} className="seguimiento-case-card">
                                            <div className="seguimiento-case-top">
                                                <div>
                                                    <h2>{caseData?.display_label ?? caseData?.private_label ?? 'Caso sin etiqueta'}</h2>
                                                    <p>{caseData?.case_public_id ?? 'Sin código público disponible'}</p>
                                                </div>
                                                <span className="seguimiento-case-badge">
                                                    {entry.sessions_count ?? 0} {(entry.sessions_count ?? 0) === 1 ? 'sesión' : 'sesiones'}
                                                </span>
                                            </div>

                                            <div className="seguimiento-case-meta">
                                                <div>
                                                    <strong>Último estado</strong>
                                                    <span>{normalizeSessionStatus(latestSession?.status)}</span>
                                                </div>
                                                <div>
                                                    <strong>Último procesamiento</strong>
                                                    <span>{formatDateTime(latestSession?.processed_at)}</span>
                                                </div>
                                                <div>
                                                    <strong>Revisión profesional</strong>
                                                    <span>{latestSession?.needs_professional_review ? 'Sí' : 'No'}</span>
                                                </div>
                                            </div>

                                            <div className="seguimiento-domain-list">
                                                <h3>Resumen por dominio</h3>
                                                {entry.domain_breakdown && entry.domain_breakdown.length > 0 ? (
                                                    entry.domain_breakdown.map((domain) => (
                                                        <div key={`${caseData?.case_id}-${domain.domain}`} className="seguimiento-domain-row">
                                                            <strong>{normalizeDomainLabel(domain.domain)}</strong>
                                                            <span>{formatPercent(domain.latest_probability)}</span>
                                                            <span>{normalizeAlertLevel(domain.latest_alert_level)}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p>No hay resumen de dominios disponible para este periodo.</p>
                                                )}
                                            </div>

                                            <div className="seguimiento-trend-list">
                                                <h3>Tendencia reciente</h3>
                                                {entry.trend && entry.trend.length > 0 ? (
                                                    entry.trend.map((trendPoint) => (
                                                        <div key={`${trendPoint.session_id}-${trendPoint.date}`} className="seguimiento-trend-row">
                                                            <strong>{formatDateTime(trendPoint.date)}</strong>
                                                            <span>
                                                                {(trendPoint.domains ?? [])
                                                                    .map((domain) => `${normalizeDomainLabel(domain.domain)} ${formatPercent(domain.probability)}`)
                                                                    .join(' · ') || 'Sin dominios destacados'}
                                                            </span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p>Este caso no presenta actividad visible en la tendencia del periodo seleccionado.</p>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })
                            )}
                        </div>
                    </>
                ) : null}
            </section>
        </div>
    );
}
