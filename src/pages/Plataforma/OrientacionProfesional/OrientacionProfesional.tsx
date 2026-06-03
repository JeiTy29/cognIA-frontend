import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import '../Plataforma.css';
import './OrientacionProfesional.css';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { DashboardEmptyState } from '../../../components/DashboardCharts';
import { QuestionnaireReportDetailModal } from '../../../components/questionnaires/QuestionnaireReportDetailModal';
import { useQuestionnaireHistoryV2 } from '../../../hooks/questionnaires/useQuestionnaireHistoryV2';
import type { QuestionnaireHistoryFiltersV2 } from '../../../services/questionnaires/questionnaires.types';
import { formatDateTimeEsCO } from '../../../utils/presentation/naturalLanguage';
import { collectProfessionalReviewRecords, type NormalizedProfessionalReview } from '../../../utils/questionnaires/presentation';

const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'in_review', label: 'En revisión' },
    { value: 'reviewed', label: 'Revisado' },
    { value: 'approved', label: 'Aprobado' },
    { value: 'rejected', label: 'Rechazado' }
];

const defaultFilters: QuestionnaireHistoryFiltersV2 = { page: 1, page_size: 50 };

function getReviewListText(review: NormalizedProfessionalReview) {
    return `${review.caseLabel} ${review.reviewStatus} ${review.psychologistName} ${review.initialConcept} ${review.recommendation}`.toLowerCase();
}

export default function OrientacionProfesional() {
    const history = useQuestionnaireHistoryV2({ initialFilters: defaultFilters });
    const [query, setQuery] = useState('');
    const [searchError, setSearchError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [manualDetailSessionId, setManualDetailSessionId] = useState<string | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();

    const querySessionId = searchParams.get('sessionId') ?? searchParams.get('session_id');
    const queryReviewId = searchParams.get('reviewId') ?? searchParams.get('review_id');
    const detailSessionId = manualDetailSessionId ?? querySessionId;
    const highlightReviewId = queryReviewId;

    const reviewItems = useMemo<NormalizedProfessionalReview[]>(
        () => history.items.flatMap((item) => collectProfessionalReviewRecords(item)),
        [history.items]
    );
    useEffect(() => {
        const sessionId = searchParams.get('sessionId') ?? searchParams.get('session_id');
        const reviewId = searchParams.get('reviewId') ?? searchParams.get('review_id');

        if ((searchParams.has('session_id') && !searchParams.has('sessionId')) ||
            (searchParams.has('review_id') && !searchParams.has('reviewId'))
        ) {
            const canonicalParams = new URLSearchParams(searchParams);
            if (sessionId) {
                canonicalParams.delete('session_id');
                canonicalParams.set('sessionId', sessionId);
            }
            if (reviewId) {
                canonicalParams.delete('review_id');
                canonicalParams.set('reviewId', reviewId);
            }
            setSearchParams(canonicalParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const filteredReviews = useMemo(() => {
        const lowerQuery = query.trim().toLowerCase();
        return reviewItems.filter((review) => {
            if (statusFilter && review.rawReviewStatus.toLowerCase() !== statusFilter.toLowerCase()) return false;
            if (!lowerQuery) return true;
            return getReviewListText(review).includes(lowerQuery);
        });
    }, [query, reviewItems, statusFilter]);

    function handleSearchChange(text: string) {
        setQuery(text);
        setSearchError(null);
        const trimmed = text.trim();
        if (trimmed.length === 0) {
            // Remove q from filters by setting undefined (serializers drop undefined)
            history.patchFilters({ q: undefined, page: 1 });
            return;
        }

        if (trimmed.length > 160) {
            setSearchError('La búsqueda debe tener máximo 160 caracteres.');
            return;
        }

        history.patchFilters({ q: trimmed, page: 1 });
    }

    const visibleCount = reviewItems.length;
    const reviewedCount = reviewItems.filter((review) => review.reviewStatus.toLowerCase() !== 'pending').length;
    const pendingCount = reviewItems.filter((review) => review.reviewStatus.toLowerCase() === 'pending').length;
    const latestUpdate = useMemo(() => {
        if (reviewItems.length === 0) return null;
        return reviewItems
            .map((review) => review.updatedAt || review.createdAt)
            .filter((value): value is string => !!value)
            .sort((left, right) => (left < right ? 1 : left > right ? -1 : 0))[0] ?? null;
    }, [reviewItems]);

    return (
        <div className="plataforma-view orientacion-profesional-view">
            <section className="orientacion-profesional-header">
                <div>
                    <h1>Orientación profesional</h1>
                    <p>Consulta y filtra revisiones profesionales visibles para tu caso o evaluación.</p>
                </div>
                <div className="orientacion-profesional-actions">
                    <button type="button" className="historial-dashboard-btn" onClick={() => history.reload().catch(() => undefined)}>Actualizar</button>
                </div>
            </section>

            <section className="orientacion-profesional-summary">
                <article>
                    <span>Revisiones visibles</span>
                    <strong>{visibleCount > 0 ? visibleCount : 'Sin datos'}</strong>
                </article>
                <article>
                    <span>Revisiones revisadas</span>
                    <strong>{reviewedCount > 0 ? reviewedCount : 'Sin datos'}</strong>
                </article>
                <article>
                    <span>Revisiones pendientes</span>
                    <strong>{pendingCount > 0 ? pendingCount : 'Sin datos'}</strong>
                </article>
                <article>
                    <span>Última actualización</span>
                    <strong>{latestUpdate ? formatDateTimeEsCO(latestUpdate, 'Sin datos') : 'Sin datos'}</strong>
                </article>
            </section>

            <section className="orientacion-profesional-filters">
                <label>
                    Buscar
                    <input
                        type="text"
                        value={query}
                        onChange={(event) => handleSearchChange(event.target.value)}
                        placeholder="Buscar caso, psicólogo, concepto o recomendación"
                    />
                    {searchError ? <div className="orientacion-profesional-search-error">{searchError}</div> : null}
                </label>
                <label>
                    Estado
                    <CustomSelect
                        value={statusFilter}
                        options={statusOptions.map((item) => ({ value: item.value, label: item.label }))}
                        onChange={(value) => setStatusFilter(value)}
                        ariaLabel="Filtrar por estado de revisión"
                    />
                </label>
            </section>

            <section className="orientacion-profesional-list">
                <div className="orientacion-profesional-list-header">
                    <div>
                        <h2>Revisiones encontradas</h2>
                        <p>{visibleCount > 0 ? `Mostrando ${filteredReviews.length} de ${visibleCount} revisiones` : 'No se encontraron revisiones visibles para los filtros actuales.'}</p>
                    </div>
                </div>
                {history.loading ? (
                    <div className="orientacion-profesional-empty">Cargando revisiones profesionales...</div>
                ) : null}
                {!history.loading && filteredReviews.length === 0 ? (
                    <DashboardEmptyState
                        message={
                            visibleCount === 0
                                ? 'Aún no hay revisiones profesionales visibles en tu historial. Si ya recibiste una orientación profesional, abre el detalle del cuestionario para revisar el reporte completo.'
                                : 'No hay revisiones que coincidan con los filtros seleccionados.'
                        }
                    />
                ) : null}
                {!history.loading && filteredReviews.length > 0 ? (
                    <div className="orientacion-profesional-review-list">
                        {filteredReviews.map((review) => (
                            <article
                                className={`orientacion-profesional-review-card ${
                                    highlightReviewId === review.reviewId ? 'is-highlighted' : ''
                                }`}
                                key={review.reviewId}
                            >
                                <div className="orientacion-profesional-review-head">
                                    <div>
                                        <strong>{review.caseLabel}</strong>
                                        <span>{review.casePublicId ? `Código: ${review.casePublicId}` : 'Caso sin código público'}</span>
                                    </div>
                                    <div className="orientacion-profesional-review-status">
                                        <span className="orientacion-profesional-status-badge">{review.reviewStatus}</span>
                                        <span className="orientacion-profesional-psychologist-name">{review.psychologistName}</span>
                                    </div>
                                </div>
                                <div className="orientacion-profesional-review-body">
                                    <div>
                                        <strong>Concepto inicial</strong>
                                        <p>{review.initialConcept}</p>
                                    </div>
                                    <div>
                                        <strong>Recomendación profesional</strong>
                                        <p>{review.recommendation}</p>
                                    </div>
                                    <div>
                                        <strong>Observación</strong>
                                        <p>{review.observation}</p>
                                    </div>
                                </div>
                                <div className="orientacion-profesional-review-footer">
                                    <span>{review.updatedAt ? `Actualizada: ${formatDateTimeEsCO(review.updatedAt)}` : review.createdAt ? `Creada: ${formatDateTimeEsCO(review.createdAt)}` : 'Fecha no disponible'}</span>
                                    <button
                                        type="button"
                                        className="historial-dashboard-btn secondary"
                                        onClick={() => setManualDetailSessionId(review.sessionId)}
                                        disabled={!review.sessionId}
                                    >
                                        {review.sessionId ? 'Ver evaluación' : 'Evaluación no disponible'}
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : null}
            </section>

            <QuestionnaireReportDetailModal
                isOpen={detailSessionId !== null}
                sessionId={detailSessionId}
                role="padre"
                onClose={() => {
                    setManualDetailSessionId(null);
                    if (searchParams.has('sessionId') || searchParams.has('session_id') ||
                        searchParams.has('reviewId') || searchParams.has('review_id')) {
                        const nextParams = new URLSearchParams(searchParams);
                        nextParams.delete('sessionId');
                        nextParams.delete('session_id');
                        nextParams.delete('reviewId');
                        nextParams.delete('review_id');
                        setSearchParams(nextParams, { replace: true });
                    }
                }}
            />
        </div>
    );
}
