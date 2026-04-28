import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSharedQuestionnaireV2 } from '../../../services/questionnaires/questionnaires.api';
import type { QuestionnaireSharedDataV2DTO } from '../../../services/questionnaires/questionnaires.types';
import {
    buildSafeDisplayRows,
    formatBooleanEs,
    formatDateTimeEsCO,
    formatNaturalValue,
    formatPercentEs,
    getAlertLevelLabel,
    getConfidenceBandLabel,
    getDomainLabel,
    getModeLabel,
    getRoleLabel,
    getStatusLabel,
    mapApiErrorToUserMessage
} from '../../../utils/presentation/naturalLanguage';
import './CuestionarioCompartido.css';

function mapError(error: unknown) {
    return mapApiErrorToUserMessage(error, 'No fue posible cargar el resultado compartido.', {
        400: 'El enlace compartido no tiene un formato válido.',
        403: 'No tienes permisos para consultar este resultado compartido.',
        404: 'El enlace compartido no existe o ya no está disponible.',
        410: 'Este enlace compartido ya expiró.'
    });
}

function getString(value: unknown, fallback = '--') {
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
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
    const internalReferenceRows = useMemo(
        () =>
            buildSafeDisplayRows(
                {
                    questionnaire_id: session?.questionnaire_id ?? payload?.questionnaire_id ?? null,
                    session_id: session?.session_id ?? null,
                    mode_key: session?.mode_key ?? null,
                    share_code: payload?.share_code ?? null
                },
                {
                    includeTechnical: true,
                    includeEmpty: false,
                    customLabels: {
                        questionnaire_id: 'ID de cuestionario',
                        session_id: 'ID de sesión',
                        mode_key: 'Clave interna de modo',
                        share_code: 'Código compartido'
                    }
                }
            ),
        [payload, session]
    );
    const showNotFoundState = !loading && !error && payload && !session && !result && domains.length === 0 && comorbidity.length === 0;

    return (
        <div className="shared-questionnaire">
            <div className="shared-questionnaire-shell">
                <h1>Resultado compartido</h1>
                {loading ? <p>Cargando...</p> : null}
                {error ? <div className="shared-questionnaire-error">{error}</div> : null}

                {!loading && !error && payload ? (
                    <div className="shared-questionnaire-content">
                        <div className="shared-questionnaire-warning">
                            Este resultado es orientativo y sirve como apoyo de alerta temprana; no constituye diagnóstico clínico definitivo.
                        </div>

                        {showNotFoundState ? (
                            <div className="shared-questionnaire-empty">
                                No se encontró información útil para este enlace compartido.
                            </div>
                        ) : null}

                        <div className="shared-questionnaire-meta">
                            <div><strong>Estado del resultado</strong><span>{getStatusLabel(session?.status)}</span></div>
                            <div><strong>Modo de evaluación</strong><span>{getModeLabel(session?.mode)}</span></div>
                            <div><strong>Perfil que respondió</strong><span>{getRoleLabel(session?.role)}</span></div>
                            <div><strong>Version</strong><span>{getString(session?.version)}</span></div>
                            <div><strong>Avance reportado</strong><span>{formatPercentEs(session?.progress_pct, { mode: 'percent' })}</span></div>
                            <div><strong>Creado</strong><span>{formatDateTimeEsCO(session?.created_at)}</span></div>
                            <div><strong>Última actualización</strong><span>{formatDateTimeEsCO(session?.updated_at)}</span></div>
                        </div>

                        <div className="shared-questionnaire-section">
                            <h2>Resultado principal</h2>
                            {result ? (
                                <div className="shared-questionnaire-results">
                                    <div><strong>Resumen orientativo</strong><span>{getString(result.summary)}</span></div>
                                    <div><strong>Recomendacion operativa</strong><span>{getString(result.operational_recommendation)}</span></div>
                                    <div><strong>Calidad de completitud</strong><span>{formatPercentEs(result.completion_quality_score, { mode: 'auto' })}</span></div>
                                    <div><strong>Nivel de datos faltantes</strong><span>{formatPercentEs(result.missingness_score, { mode: 'auto' })}</span></div>
                                    <div><strong>Requiere valoración profesional</strong><span>{formatBooleanEs(result.needs_professional_review)}</span></div>
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
                                            <div><strong>Dominio evaluado</strong><span>{getDomainLabel(domain.domain)}</span></div>
                                            <div><strong>Nivel de alerta</strong><span>{getAlertLevelLabel(domain.alert_level)}</span></div>
                                            <div><strong>Nivel de confianza</strong><span>{formatPercentEs(domain.confidence_pct, { mode: 'percent' })}</span></div>
                                            <div><strong>Banda de confianza</strong><span>{getConfidenceBandLabel(domain.confidence_band)}</span></div>
                                            <div><strong>Probabilidad estimada</strong><span>{formatPercentEs(domain.probability, { mode: 'auto' })}</span></div>
                                            <div><strong>Resultado orientativo</strong><span>{getString(domain.result_summary)}</span></div>
                                            <div><strong>Clasificación operativa</strong><span>{formatNaturalValue('operational_class', domain.operational_class)}</span></div>
                                            <div><strong>Aclaración operativa</strong><span>{getString(domain.operational_caveat)}</span></div>
                                            <div><strong>Requiere valoración profesional</strong><span>{formatBooleanEs(domain.needs_professional_review)}</span></div>
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
                                            <div><strong>Relación entre dominios</strong><span>{formatNaturalValue('coexistence_key', item.coexistence_key)}</span></div>
                                            <div><strong>Dominios relacionados</strong><span>{item.domains.length > 0 ? item.domains.map((domainName) => getDomainLabel(domainName, domainName)).join(', ') : '--'}</span></div>
                                            <div><strong>Riesgo combinado</strong><span>{formatPercentEs(item.combined_risk_score, { mode: 'auto' })}</span></div>
                                            <div><strong>Nivel de coexistencia</strong><span>{formatNaturalValue('coexistence_level', item.coexistence_level)}</span></div>
                                            <div><strong>Resumen orientativo</strong><span>{getString(item.summary)}</span></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {internalReferenceRows.length > 0 ? (
                            <div className="shared-questionnaire-section shared-questionnaire-secondary">
                                <h2>Referencia interna</h2>
                                <div className="shared-questionnaire-results">
                                    {internalReferenceRows.map((row) => (
                                        <div key={row.key}>
                                            <strong>{row.label}</strong>
                                            <span>{row.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
