import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSharedQuestionnaireV2 } from '../../../services/questionnaires/questionnaires.api';
import type { QuestionnaireSharedDataV2DTO } from '../../../services/questionnaires/questionnaires.types';
import { ApiError } from '../../../services/api/httpClient';
import './CuestionarioCompartido.css';

function mapError(error: unknown) {
    if (!(error instanceof ApiError)) return 'No fue posible cargar el resultado compartido.';
    if (error.status === 400) return 'El enlace compartido no tiene un formato valido.';
    if (error.status === 404) return 'El enlace compartido no existe o expiro.';
    if (error.status === 410) return 'El enlace compartido ya no esta disponible.';
    if (error.status === 403) return 'No tienes permisos para ver este recurso compartido.';
    if (error.status >= 500) return 'Error del servidor. Intenta mas tarde.';
    return 'No fue posible cargar el resultado compartido.';
}

function getString(value: unknown, fallback = '--') {
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function getNumber(value: unknown, fallback = '--') {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return String(parsed);
}

function getDate(value: unknown) {
    if (typeof value !== 'string' || !value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return `${date.toLocaleDateString('es-CO')} ${date.toLocaleTimeString('es-CO')}`;
}

function getModeLabel(mode: string | undefined) {
    const normalized = (mode ?? '').toLowerCase();
    if (normalized === 'short') return 'Corto';
    if (normalized === 'medium') return 'Medio';
    if (normalized === 'complete') return 'Completo';
    return mode ?? '--';
}

function getRoleLabel(role: string | undefined) {
    const normalized = (role ?? '').toLowerCase();
    if (normalized === 'guardian') return 'Tutor';
    if (normalized === 'caregiver') return 'Cuidador';
    if (normalized === 'psychologist') return 'Psicologo';
    return role ?? '--';
}

function getStatusLabel(status: string | undefined) {
    const normalized = (status ?? '').toLowerCase();
    if (normalized === 'draft') return 'Borrador';
    if (normalized === 'in_progress') return 'En progreso';
    if (normalized === 'submitted') return 'Enviado';
    if (normalized === 'processed') return 'Procesado';
    if (normalized === 'failed') return 'Fallido';
    if (normalized === 'archived') return 'Archivado';
    return status ?? '--';
}

export default function CuestionarioCompartido() {
    const { questionnaireId = '', shareCode = '' } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [payload, setPayload] = useState<QuestionnaireSharedDataV2DTO | null>(null);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void (async () => {
                if (!questionnaireId || !shareCode) {
                    setPayload(null);
                    setError('El enlace compartido no es valido.');
                    setLoading(false);
                    return;
                }
                setLoading(true);
                setError(null);
                try {
                    const response = await getSharedQuestionnaireV2(questionnaireId, shareCode);
                    setPayload(response);
                } catch (requestError) {
                    setError(mapError(requestError));
                } finally {
                    setLoading(false);
                }
            })();
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [questionnaireId, shareCode]);

    const session = useMemo(() => payload?.session ?? null, [payload]);
    const result = useMemo(() => payload?.result ?? null, [payload]);
    const domains = useMemo(() => payload?.domains ?? [], [payload]);
    const comorbidity = useMemo(() => payload?.comorbidity ?? [], [payload]);
    const showNotFoundState = !loading && !error && payload && !session && !result && domains.length === 0 && comorbidity.length === 0;

    return (
        <div className="shared-questionnaire">
            <div className="shared-questionnaire-shell">
                <h1>Resultado compartido</h1>
                {loading ? <p>Cargando...</p> : null}
                {error ? <div className="shared-questionnaire-error">{error}</div> : null}

                {!loading && !error && payload ? (
                    <div className="shared-questionnaire-content">
                        {showNotFoundState ? (
                            <div className="shared-questionnaire-empty">
                                No se encontro informacion util para este enlace compartido.
                            </div>
                        ) : null}

                        <div className="shared-questionnaire-meta">
                            <div><strong>Questionnaire ID</strong><span>{getString(session?.questionnaire_id ?? payload.questionnaire_id)}</span></div>
                            <div><strong>Session ID</strong><span>{getString(session?.session_id)}</span></div>
                            <div><strong>Estado</strong><span>{getStatusLabel(session?.status)}</span></div>
                            <div><strong>Modo</strong><span>{getModeLabel(session?.mode)}</span></div>
                            <div><strong>Rol</strong><span>{getRoleLabel(session?.role)}</span></div>
                            <div><strong>Version</strong><span>{getString(session?.version)}</span></div>
                            <div><strong>Progreso (%)</strong><span>{getNumber(session?.progress_pct)}</span></div>
                            <div><strong>Mode key</strong><span>{getString(session?.mode_key)}</span></div>
                            <div><strong>Creado</strong><span>{getDate(session?.created_at)}</span></div>
                            <div><strong>Actualizado</strong><span>{getDate(session?.updated_at)}</span></div>
                        </div>

                        <div className="shared-questionnaire-section">
                            <h2>Resultado principal</h2>
                            {result ? (
                                <div className="shared-questionnaire-results">
                                    <div><strong>Summary</strong><span>{getString(result.summary)}</span></div>
                                    <div><strong>Recomendacion operativa</strong><span>{getString(result.operational_recommendation)}</span></div>
                                    <div><strong>Completion quality score</strong><span>{getNumber(result.completion_quality_score)}</span></div>
                                    <div><strong>Missingness score</strong><span>{getNumber(result.missingness_score)}</span></div>
                                    <div><strong>Needs professional review</strong><span>{result.needs_professional_review === null || result.needs_professional_review === undefined ? '--' : result.needs_professional_review ? 'Si' : 'No'}</span></div>
                                </div>
                            ) : (
                                <p>No hay resultado principal disponible.</p>
                            )}
                        </div>

                        <div className="shared-questionnaire-section">
                            <h2>Dominios</h2>
                            {domains.length === 0 ? (
                                <p>No hay dominios disponibles.</p>
                            ) : (
                                <div className="shared-questionnaire-domain-list">
                                    {domains.map((domain, index) => (
                                        <div className="shared-questionnaire-domain" key={`${domain.domain}-${index}`}>
                                            <div><strong>Domain</strong><span>{getString(domain.domain)}</span></div>
                                            <div><strong>Alert level</strong><span>{getString(domain.alert_level)}</span></div>
                                            <div><strong>Confidence (%)</strong><span>{getNumber(domain.confidence_pct)}</span></div>
                                            <div><strong>Confidence band</strong><span>{getString(domain.confidence_band)}</span></div>
                                            <div><strong>Probability</strong><span>{getNumber(domain.probability)}</span></div>
                                            <div><strong>Result summary</strong><span>{getString(domain.result_summary)}</span></div>
                                            <div><strong>Operational class</strong><span>{getString(domain.operational_class)}</span></div>
                                            <div><strong>Operational caveat</strong><span>{getString(domain.operational_caveat)}</span></div>
                                            <div><strong>Needs professional review</strong><span>{domain.needs_professional_review === null || domain.needs_professional_review === undefined ? '--' : domain.needs_professional_review ? 'Si' : 'No'}</span></div>
                                            <div><strong>Model ID</strong><span>{getString(domain.model_id)}</span></div>
                                            <div><strong>Model version</strong><span>{getString(domain.model_version)}</span></div>
                                            <div><strong>Mode</strong><span>{getString(domain.mode)}</span></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="shared-questionnaire-section">
                            <h2>Comorbilidad</h2>
                            {comorbidity.length === 0 ? (
                                <p>No hay datos de comorbilidad disponibles.</p>
                            ) : (
                                <div className="shared-questionnaire-domain-list">
                                    {comorbidity.map((item, index) => (
                                        <div className="shared-questionnaire-domain" key={`${item.coexistence_key}-${index}`}>
                                            <div><strong>Coexistence key</strong><span>{getString(item.coexistence_key)}</span></div>
                                            <div><strong>Domains</strong><span>{item.domains.length > 0 ? item.domains.join(', ') : '--'}</span></div>
                                            <div><strong>Combined risk score</strong><span>{getNumber(item.combined_risk_score)}</span></div>
                                            <div><strong>Coexistence level</strong><span>{getString(item.coexistence_level)}</span></div>
                                            <div><strong>Summary</strong><span>{getString(item.summary)}</span></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
