import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSharedQuestionnaireV2 } from '../../../services/questionnaires/questionnaires.api';
import type { QuestionnaireSharedDataV2DTO } from '../../../services/questionnaires/questionnaires.types';
import { ApiError } from '../../../services/api/httpClient';
import './CuestionarioCompartido.css';

function mapError(error: unknown) {
    if (!(error instanceof ApiError)) return 'No fue posible cargar el resultado compartido.';
    if (error.status === 404) return 'El enlace compartido no existe o expiro.';
    if (error.status === 410) return 'El enlace compartido ya no esta disponible.';
    if (error.status === 403) return 'No tienes permisos para ver este recurso compartido.';
    if (error.status >= 500) return 'Error del servidor. Intenta mas tarde.';
    return 'No fue posible cargar el resultado compartido.';
}

function getString(value: unknown, fallback = '--') {
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function getDate(value: unknown) {
    if (typeof value !== 'string' || !value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return `${date.toLocaleDateString('es-CO')} ${date.toLocaleTimeString('es-CO')}`;
}

function toRecord(payload: unknown): Record<string, unknown> | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    return payload as Record<string, unknown>;
}

function toLabel(key: string) {
    const label = key.replace(/_/g, ' ').trim();
    if (!label) return '--';
    return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatValue(value: unknown) {
    if (value === null || value === undefined) return '--';
    if (typeof value === 'string') return value.trim().length > 0 ? value : '--';
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
        if (value.length === 0) return '--';
        const scalarValues = value.filter((item) => ['string', 'number', 'boolean'].includes(typeof item));
        if (scalarValues.length === value.length) return scalarValues.map(String).join(', ');
        return `${value.length} elemento(s)`;
    }
    if (typeof value === 'object') return 'Disponible';
    return '--';
}

export default function CuestionarioCompartido() {
    const { questionnaireId = '', shareCode = '' } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [payload, setPayload] = useState<QuestionnaireSharedDataV2DTO | null>(null);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void (async () => {
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

    const resultsRecord = useMemo(() => toRecord(payload?.results), [payload]);
    const resultRows = useMemo(() => {
        if (!resultsRecord) return [];
        return Object.entries(resultsRecord)
            .map(([key, value]) => ({
                key,
                label: toLabel(key),
                value: formatValue(value)
            }))
            .filter((row) => row.value !== '--');
    }, [resultsRecord]);

    return (
        <div className="shared-questionnaire">
            <div className="shared-questionnaire-shell">
                <h1>Resultado compartido</h1>
                {loading ? <p>Cargando...</p> : null}
                {error ? <div className="shared-questionnaire-error">{error}</div> : null}

                {!loading && !error && payload ? (
                    <div className="shared-questionnaire-content">
                        <div className="shared-questionnaire-meta">
                            <div><strong>Titulo</strong><span>{getString(payload.name || payload.title)}</span></div>
                            <div><strong>Version</strong><span>{getString(payload.version)}</span></div>
                            <div><strong>Estado</strong><span>{getString(payload.status)}</span></div>
                            <div><strong>Modo</strong><span>{getString(payload.mode)}</span></div>
                            <div><strong>Rol</strong><span>{getString(payload.role)}</span></div>
                            <div><strong>Creado</strong><span>{getDate(payload.created_at)}</span></div>
                            <div><strong>Actualizado</strong><span>{getDate(payload.updated_at)}</span></div>
                            <div><strong>Expira</strong><span>{getDate(payload.expires_at)}</span></div>
                        </div>

                        <div className="shared-questionnaire-section">
                            <h2>Resultados</h2>
                            {resultRows.length === 0 ? (
                                <p>No hay resultados compartidos disponibles.</p>
                            ) : (
                                <div className="shared-questionnaire-results">
                                    {resultRows.map((row) => (
                                        <div key={row.key}>
                                            <strong>{row.label}</strong>
                                            <span>{row.value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="shared-questionnaire-section">
                            <h2>Etiquetas</h2>
                            {Array.isArray(payload.tags) && payload.tags.length > 0 ? (
                                <div className="shared-questionnaire-tags">
                                    {payload.tags.map((tag, index) => (
                                        <span key={`${tag.id ?? tag.tag_id ?? index}`} className="shared-questionnaire-tag">
                                            {getString(tag.tag, '--')}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p>Sin etiquetas compartidas.</p>
                            )}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
