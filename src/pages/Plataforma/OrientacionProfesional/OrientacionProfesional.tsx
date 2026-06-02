import { useMemo, useState } from 'react';
import '../Plataforma.css';
import './OrientacionProfesional.css';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { DashboardEmptyState } from '../../../components/DashboardCharts';
import { QuestionnaireReportDetailModal } from '../../../components/questionnaires/QuestionnaireReportDetailModal';
import { useQuestionnaireHistoryV2 } from '../../../hooks/questionnaires/useQuestionnaireHistoryV2';
import type { QuestionnaireHistoryFiltersV2, QuestionnaireHistoryItemV2DTO } from '../../../services/questionnaires/questionnaires.types';
import { formatDateTimeEsCO } from '../../../utils/presentation/naturalLanguage';
import { normalizeBackendText, normalizeReviewStatus } from '../../../utils/questionnaires/presentation';

type ReviewItem = {
    id: string;
    sessionId: string | null;
    caseId: string | null;
    caseLabel: string;
    casePublicId: string | null;
    rawReviewStatus: string;
    reviewStatus: string;
    psychologistName: string;
    initialConcept: string;
    recommendation: string;
    observation: string;
    updatedAt: string | null;
    createdAt: string | null;
    visibleToGuardian: boolean;
};

const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'in_review', label: 'En revisión' },
    { value: 'reviewed', label: 'Revisado' },
    { value: 'approved', label: 'Aprobado' },
    { value: 'rejected', label: 'Rechazado' }
];

const defaultFilters: QuestionnaireHistoryFiltersV2 = { page: 1, page_size: 50 };

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '';
}

function buildReviewFromRecord(review: Record<string, unknown>, item: QuestionnaireHistoryItemV2DTO): ReviewItem | null {
    if (review.visible_to_guardian === false) return null;

    const sessionId = readString(review.session_id ?? review.questionnaire_session_id ?? item.session_id ?? item.id ?? item.questionnaire_session_id);
    const id = readString(review.review_id ?? review.id ?? `${item.id ?? 'review'}-${sessionId ?? 'unknown'}`);
    const rawReviewStatus = readString(review.review_status ?? review.status ?? item.review_status ?? '');
    const reviewStatus = normalizeReviewStatus(rawReviewStatus);
    const psychologistName = readString(
        review.psychologist_display_name ?? review.psychologist_name ?? review.psychologist_username ?? review.psychologist_user
    );

    return {
        id: id || `review-${item.id}`,
        sessionId: sessionId || null,
        caseId: readString(item.case_id ?? item.case_id),
        caseLabel: readString(item.case_display_label ?? item.case_label ?? item.title ?? 'Caso sin etiqueta'),
        casePublicId: readString(item.case_public_id ?? null),
        rawReviewStatus,
        reviewStatus,
        psychologistName: psychologistName || 'Psicólogo asignado',
        initialConcept: normalizeBackendText(review.initial_concept ?? review.concept ?? review.initial_concept_text, 'Sin concepto registrado'),
        recommendation: normalizeBackendText(review.recommendation ?? review.recommendation_text ?? review.advice, 'Sin recomendación registrada'),
        observation: normalizeBackendText(review.observation ?? review.notes ?? review.comment ?? review.description, 'Sin observación registrada'),
        updatedAt: readString(review.updated_at ?? review.updatedAt ?? ''),
        createdAt: readString(review.created_at ?? review.createdAt ?? ''),
        visibleToGuardian: review.visible_to_guardian !== false
    };
}

function collectReviewRecords(item: QuestionnaireHistoryItemV2DTO): ReviewItem[] {
    const reviews: ReviewItem[] = [];
    const record = item as Record<string, unknown>;

    const candidates = [record.latest_review, record.professional_review, record.review] as Array<unknown>;
    for (const candidate of candidates) {
        if (isObject(candidate)) {
            const review = buildReviewFromRecord(candidate, item);
            if (review) reviews.push(review);
        }
    }

    const arrays = [record.professional_reviews, record.reviews, record.session_reviews] as Array<unknown>;
    for (const candidate of arrays) {
        if (Array.isArray(candidate)) {
            for (const element of candidate) {
                if (isObject(element)) {
                    const review = buildReviewFromRecord(element, item);
                    if (review) reviews.push(review);
                }
            }
        }
    }

    const hasEmbeddedReview = Boolean(
        record.review_status ||
        record.initial_concept ||
        record.recommendation ||
        record.visible_to_guardian !== undefined
    );

    if (reviews.length === 0 && hasEmbeddedReview) {
        const review = buildReviewFromRecord(record, item);
        if (review) reviews.push(review);
    }

    return reviews;
}

function getReviewListText(review: ReviewItem) {
    return `${review.caseLabel} ${review.reviewStatus} ${review.psychologistName} ${review.initialConcept} ${review.recommendation}`.toLowerCase();
}

export default function OrientacionProfesional() {
    const history = useQuestionnaireHistoryV2({ initialFilters: defaultFilters });
    const [query, setQuery] = useState('');
    const [searchError, setSearchError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [detailSessionId, setDetailSessionId] = useState<string | null>(null);

    const reviewItems = useMemo(() => history.items.flatMap(collectReviewRecords), [history.items]);
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
                            <article className="orientacion-profesional-review-card" key={review.id}>
                                <div className="orientacion-profesional-review-head">
                                    <div>
                                        <strong>{review.caseLabel}</strong>
                                        <span>{review.casePublicId ? `Código: ${review.casePublicId}` : 'Caso sin código público'}</span>
                                    </div>
                                    <div className="orientacion-profesional-review-status">
                                        <strong>{review.reviewStatus}</strong>
                                        <span>{review.psychologistName}</span>
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
                                        onClick={() => setDetailSessionId(review.sessionId)}
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
                onClose={() => setDetailSessionId(null)}
            />
        </div>
    );
}
