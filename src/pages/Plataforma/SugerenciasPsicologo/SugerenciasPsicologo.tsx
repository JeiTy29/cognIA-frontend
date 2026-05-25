import { useEffect, useMemo, useState } from 'react';
import { AlertBadge } from '../../../components/AlertBadge/AlertBadge';
import {
    acceptPsychologistShareRequestV2,
    getPsychologistShareRequestsV2,
    rejectPsychologistShareRequestV2
} from '../../../services/questionnaires/questionnaires.api';
import type { QuestionnairePsychologistShareRequestV2DTO } from '../../../services/questionnaires/questionnaires.types';
import { formatDateTimeEsCO, getDomainLabel, mapApiErrorToUserMessage } from '../../../utils/presentation/naturalLanguage';
import '../Plataforma.css';
import './SugerenciasPsicologo.css';

type TabFilter = 'pending' | 'accepted' | 'rejected' | 'all';

const tabLabels: Array<{ value: TabFilter; label: string }> = [
    { value: 'pending', label: 'Pendientes' },
    { value: 'accepted', label: 'Aceptadas' },
    { value: 'rejected', label: 'Rechazadas' },
    { value: 'all', label: 'Todas' }
];

function normalizeStatus(value: string | null | undefined): TabFilter {
    const normalized = (value ?? '').trim().toLowerCase();
    if (normalized === 'pending') return 'pending';
    if (normalized === 'accepted') return 'accepted';
    if (normalized === 'rejected') return 'rejected';
    return 'all';
}

export default function SugerenciasPsicologo() {
    const [tab, setTab] = useState<TabFilter>('pending');
    const [items, setItems] = useState<QuestionnairePsychologistShareRequestV2DTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getPsychologistShareRequestsV2({ page: 1, page_size: 50, status: tab === 'all' ? undefined : tab });
            setItems(response.items ?? []);
        } catch (requestError) {
            setError(mapApiErrorToUserMessage(requestError, 'No fue posible cargar solicitudes de revisión.'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load().catch(() => undefined);
    }, [tab]);

    const counters = useMemo(() => {
        const pending = items.filter((item) => normalizeStatus(item.status) === 'pending').length;
        const accepted = items.filter((item) => normalizeStatus(item.status) === 'accepted').length;
        const rejected = items.filter((item) => normalizeStatus(item.status) === 'rejected').length;
        return { pending, accepted, rejected };
    }, [items]);

    const handleDecision = async (grantId: string, action: 'accept' | 'reject') => {
        setFeedback(null);
        try {
            if (action === 'accept') {
                await acceptPsychologistShareRequestV2(grantId);
                setFeedback('Solicitud aceptada correctamente.');
            } else {
                await rejectPsychologistShareRequestV2(grantId);
                setFeedback('Solicitud rechazada.');
            }
            await load();
        } catch (requestError) {
            setError(mapApiErrorToUserMessage(requestError, 'No fue posible procesar la solicitud.'));
        }
    };

    return (
        <div className="plataforma-view">
            <section className="share-requests">
                <header className="share-requests-header">
                    <div>
                        <h1>Solicitudes de revisión</h1>
                        <p>Gestiona accesos compartidos antes de que aparezcan en tu dashboard principal.</p>
                    </div>
                    <button type="button" className="share-requests-btn" onClick={() => load().catch(() => undefined)}>
                        Actualizar
                    </button>
                </header>

                <div className="share-requests-kpis">
                    <article><span>Pendientes</span><strong>{counters.pending}</strong></article>
                    <article><span>Aceptadas</span><strong>{counters.accepted}</strong></article>
                    <article><span>Rechazadas</span><strong>{counters.rejected}</strong></article>
                </div>

                <div className="share-requests-tabs">
                    {tabLabels.map((option) => (
                        <button
                            type="button"
                            key={option.value}
                            className={`share-requests-tab ${tab === option.value ? 'is-active' : ''}`}
                            onClick={() => setTab(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                {feedback ? <div className="share-requests-alert success">{feedback}</div> : null}
                {error ? <div className="share-requests-alert error">{error}</div> : null}
                {loading ? <div className="share-requests-empty">Cargando solicitudes...</div> : null}
                {!loading && items.length === 0 ? <div className="share-requests-empty">No hay solicitudes en este estado.</div> : null}

                <div className="share-requests-grid">
                    {items.map((item) => (
                        <article className="share-requests-card" key={item.grant_id}>
                            <div className="share-requests-card-row">
                                <strong>{item.case_display_label ?? item.case_private_label ?? item.case_public_id ?? item.grant_id}</strong>
                                <AlertBadge level={item.latest_alert_level} />
                            </div>
                            <div><strong>Caso público:</strong> {item.case_public_id ?? '--'}</div>
                            <div><strong>Dominio principal:</strong> {getDomainLabel(item.dominant_domain)}</div>
                            <div><strong>Requiere revisión:</strong> {item.needs_professional_review ? 'Sí' : 'No'}</div>
                            <div><strong>Recibida:</strong> {formatDateTimeEsCO(item.created_at)}</div>
                            <div className="share-requests-status">
                                Estado: <span>{normalizeStatus(item.status)}</span>
                            </div>
                            <div className="share-requests-permissions">
                                <span>{item.can_tag ? 'Puede etiquetar' : 'Sin etiquetado'}</span>
                                <span>{item.can_download_pdf ? 'Puede descargar PDF' : 'Sin descarga PDF'}</span>
                            </div>
                            {normalizeStatus(item.status) === 'pending' ? (
                                <div className="share-requests-actions">
                                    <button type="button" className="share-requests-btn" onClick={() => handleDecision(item.grant_id, 'accept').catch(() => undefined)}>Aceptar</button>
                                    <button type="button" className="share-requests-btn secondary" onClick={() => handleDecision(item.grant_id, 'reject').catch(() => undefined)}>Rechazar</button>
                                </div>
                            ) : null}
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
}
