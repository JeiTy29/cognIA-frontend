import { useMemo, useState } from 'react';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { Modal } from '../../../components/Modal/Modal';
import { useQuestionnaireHistoryV2 } from '../../../hooks/questionnaires/useQuestionnaireHistoryV2';
import { ApiError } from '../../../services/api/httpClient';
import {
    addQuestionnaireHistoryTagV2,
    deleteQuestionnaireHistoryTagV2,
    downloadQuestionnaireHistoryPdfV2,
    generateQuestionnaireHistoryPdfV2,
    getAllQuestionnaireSessionQuestionsV2,
    getQuestionnaireClinicalSummaryV2,
    getQuestionnaireHistoryDetailV2,
    getQuestionnaireHistoryResultsV2,
    getQuestionnaireReportPreviewV2,
    getQuestionnaireSessionV2,
    searchPsychologistsV2,
    shareQuestionnaireWithPsychologistV2
} from '../../../services/questionnaires/questionnaires.api';
import type {
    QuestionnaireClinicalSummaryV2DTO,
    QuestionnaireHistoryDetailV2DTO,
    QuestionnaireHistoryItemV2DTO,
    QuestionnaireProfessionalReviewDTO,
    QuestionnaireQuestionV2DTO,
    QuestionnaireReportPreviewDTO,
    QuestionnaireSecureResultsV2DTO,
    QuestionnaireSessionV2DTO,
    QuestionnaireTagDTO,
    PsychologistSearchItemDTO
} from '../../../services/questionnaires/questionnaires.types';
import { buildReportViewModel } from '../../../utils/presentation/clinicalReport';
import {
    buildSafeDisplayRows,
    formatDateTimeEsCO,
    getModeLabel,
    getRoleLabel,
    getStatusLabel,
    mapApiErrorToUserMessage
} from '../../../utils/presentation/naturalLanguage';
import { downloadPdfBlob } from '../../../utils/presentation/reportPdf';
import { buildQuestionnaireAlertPdf, buildQuestionnaireAlertPdfFileName } from '../../../utils/reports/questionnaireAlertPdf';
import { normalizeBackendText } from '../../../utils/questionnaires/presentation';
import './HistorialBase.css';

type HistorialRole = 'padre' | 'psicologo';

interface HistorialBaseProps {
    role: HistorialRole;
}

interface BulletItem {
    key: string;
    text: string;
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

const pageSizeOptions = [
    { value: '10', label: '10' },
    { value: '20', label: '20' },
    { value: '50', label: '50' }
];

const tagColorOptions = [
    { value: '#215f8f', label: 'Azul' },
    { value: '#198e50', label: 'Verde' },
    { value: '#d97a1f', label: 'Naranja' },
    { value: '#7b4bbf', label: 'Violeta' },
    { value: '#c23f5a', label: 'Frambuesa' },
    { value: '#4f7a6a', label: 'Oliva' },
    { value: '#3e6ea8', label: 'Índigo' },
    { value: '#6a6f7d', label: 'Gris' }
];

const defaultTagColor = tagColorOptions[0].value;

const hiddenResultFields = [
    'id',
    'session_id',
    'questionnaire_id',
    'questionnaire_template_id',
    'model_id',
    'model_version',
    'mode_key',
    'raw',
    'payload',
    'metadata',
    'download_url',
    'file_id',
    'mime_type'
];

function buildAlertReportFallbackFileName() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `Reporte CognIA - Alerta - ${yyyy}-${mm}-${dd}.pdf`;
}

const DOMAIN_LABELS: Record<string, string> = {
    adhd: 'TDAH',
    conduct: 'Conducta',
    conduct_disorder: 'Conducta',
    elimination: 'Eliminación',
    elimination_disorder: 'Eliminación',
    anxiety: 'Ansiedad',
    anxiety_disorder: 'Ansiedad',
    depression: 'Depresión',
    depressive_disorder: 'Depresión'
};

const TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
    [/Ã¡/g, 'á'],
    [/Ã©/g, 'é'],
    [/Ã­/g, 'í'],
    [/Ã³/g, 'ó'],
    [/Ãº/g, 'ú'],
    [/Ã/g, 'Á'],
    [/Ã‰/g, 'É'],
    [/Ã/g, 'Í'],
    [/Ã“/g, 'Ó'],
    [/Ãš/g, 'Ú'],
    [/Ã±/g, 'ñ'],
    [/Ã‘/g, 'Ñ'],
    [/Â¿/g, '¿'],
    [/Â¡/g, '¡'],
    [/â€“/g, '–'],
    [/â€”/g, '—'],
    [/â€¦/g, '…'],
    [/â€¢/g, '•'],
    [/â€œ/g, '"'],
    [/â€/g, '"'],
    [/â€™/g, "'"],
    [/Â·/g, '·'],
    [/sesi\?n/gi, 'sesión'],
    [/evaluaci\?n/gi, 'evaluación'],
    [/diagn\?stico/gi, 'diagnóstico'],
    [/cl\?nico/gi, 'clínico'],
    [/informaci\?n/gi, 'información'],
    [/psicol\?gica/gi, 'psicológica'],
    [/m\?dica/gi, 'médica'],
    [/orientaci\?n/gi, 'orientación'],
    [/recomendaci\?n/gi, 'recomendación'],
    [/s\?ntesis/gi, 'síntesis'],
    [/aclaraci\?n/gi, 'aclaración'],
    [/actualizaci\?n/gi, 'actualización'],
    [/patr\?n/gi, 'patrón'],
    [/se\?ales/gi, 'señales'],
    [/tambi\?n/gi, 'también'],
    [/seg\?n/gi, 'según'],
    [/respondi\?/gi, 'respondió'],
    [/\?ltima/gi, 'Última'],
    [/preparaci\?n/gi, 'preparación'],
    [/generaci\?n/gi, 'generación'],
    [/todav\?a/gi, 'todavía'],
    [/a\?n/gi, 'aún'],
    [/l\?mite/gi, 'límite'],
    [/tama\?o/gi, 'tamaño'],
    [/p\?gina/gi, 'página']
];

const NON_TEXT_PATTERNS = [/https?:\/\//i, /^[A-Za-z0-9_-]{6,}$/];

function runHistoryTask(task: () => Promise<void>) {
    task().catch(() => undefined);
}

function getString(value: unknown, fallback = '--') {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function readOptionalString(value: unknown) {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function toRecord(payload: unknown): Record<string, unknown> | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    return payload as Record<string, unknown>;
}

function resolveTagId(tag: QuestionnaireTagDTO) {
    if (typeof tag.id === 'string' && tag.id.trim().length > 0) return tag.id;
    if (typeof tag.tag_id === 'string' && tag.tag_id.trim().length > 0) return tag.tag_id;
    return '';
}

function normalizeTagColor(color: string | null | undefined) {
    const value = (color ?? '').trim();
    return value || defaultTagColor;
}

function shouldPreserveRawText(value: string) {
    return NON_TEXT_PATTERNS.some((pattern) => pattern.test(value));
}

function replaceKnownDomainsInText(text: string) {
    return Object.entries(DOMAIN_LABELS).sort((left, right) => right[0].length - left[0].length).reduce(
        (current, [domainKey, label]) =>
            current.replace(new RegExp(`\\b${domainKey.replace(/_/g, '[_-]')}\\b`, 'gi'), label),
        text
    );
}

function normalizeMojibakeText(value: string) {
    if (!value.trim() || shouldPreserveRawText(value)) return value;

    let next = value;
    for (const [pattern, replacement] of TEXT_REPLACEMENTS) {
        next = next.replace(pattern, replacement);
    }

    next = replaceKnownDomainsInText(next);
    return next.replace(/\s+/g, ' ').trim();
}

function normalizeClinicalTextPresentation(value: unknown, fallback = 'No disponible') {
    if (typeof value !== 'string' || value.trim().length === 0) return fallback;
    return normalizeMojibakeText(value);
}

function getApiErrorCode(error: unknown) {
    if (!(error instanceof ApiError)) return null;
    const payload = toRecord(error.payload);
    const codeCandidates = [
        readOptionalString(payload?.error),
        readOptionalString(payload?.code),
        readOptionalString(payload?.msg)
    ].filter((candidate): candidate is string => Boolean(candidate));
    if (codeCandidates.length === 0) return null;
    return codeCandidates[0].trim().toLowerCase();
}

function buildActionErrorMessage(error: unknown, fallback: string) {
    const code = getApiErrorCode(error);
    if (code === 'plaintext_not_allowed' || code === 'encrypted_transport_required_for_sensitive_endpoint') {
        return 'No se pudo completar la acción porque requiere transporte seguro. Intenta nuevamente.';
    }
    if (code === 'transport_key_failed') {
        return 'No se pudo preparar el canal seguro. Intenta nuevamente.';
    }
    if (code === 'forbidden' || (error instanceof ApiError && error.status === 403)) {
        return 'No tienes permisos para realizar esta acción.';
    }
    if (code === 'not_found' || (error instanceof ApiError && error.status === 404)) {
        return 'No se encontró el recurso solicitado.';
    }
    if (code === 'pdf_file_missing') {
        return 'El PDF todavía no está disponible. Intenta generarlo nuevamente.';
    }
    if (code === 'runtime_artifact_unavailable') {
        return 'El motor de análisis no está disponible. El resultado no puede recalcularse en este momento.';
    }

    return mapApiErrorToUserMessage(error, fallback);
}

function canLoadClinicalArtifacts(status: string | null | undefined) {
    const normalized = (status ?? '').trim().toLowerCase();
    return normalized === 'submitted' || normalized === 'processed';
}

function resolveQuestionnaireId(
    detail: QuestionnaireHistoryDetailV2DTO | null
) {
    const candidates: unknown[] = [detail?.questionnaire_id, detail?.questionnaire_template_id];
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            return candidate.trim();
        }
    }

    return null;
}

function resolveSessionTitle(item: QuestionnaireHistoryItemV2DTO, index: number) {
    const named = getString(item.title ?? item.name, '');
    if (named) return normalizeClinicalTextPresentation(named, '');
    const mode = normalizeClinicalTextPresentation(getModeLabel(item.mode, ''), '');
    const status = normalizeClinicalTextPresentation(getStatusLabel(item.status, ''), '');
    if (mode && status) return `${mode} · ${status}`;
    return `Registro ${index + 1}`;
}

function resolveHistoryCaseLabel(item: QuestionnaireHistoryItemV2DTO) {
    const record = item as Record<string, unknown>;
    const caseRecord = toRecord(record.case);
    const label = normalizeClinicalTextPresentation(
        caseRecord?.display_label ??
        caseRecord?.private_label ??
        record.case_display_label ??
        record.case_private_label ??
        record.case_label ??
        caseRecord?.case_public_id ??
        record.case_public_id,
        ''
    );

    return label ? `Caso: ${label}` : 'Sin caso asociado';
}

function resolveSessionMetadataRows(
    detail: QuestionnaireHistoryDetailV2DTO | null,
    detailSessionId: string | null,
    questionnaireIdForShare: string | null
) {
    return buildSafeDisplayRows(
        {
            session_id: detail?.id ?? detailSessionId,
            questionnaire_id: questionnaireIdForShare,
            mode_key: detail?.mode_key ?? null
        },
        {
            includeTechnical: true,
            includeEmpty: false,
            customLabels: {
                session_id: 'ID de sesión',
                questionnaire_id: 'ID de cuestionario',
                mode_key: 'Clave interna de modo'
            }
        }
    );
}

type HistoryDetailLoadResult =
    | {
        ok: true;
        detail: QuestionnaireHistoryDetailV2DTO;
        results: QuestionnaireSecureResultsV2DTO | null;
        summary: QuestionnaireClinicalSummaryV2DTO | null;
        preview: QuestionnaireReportPreviewDTO | null;
        visibleReviews: QuestionnaireProfessionalReviewDTO[];
        notice: string | null;
    }
    | {
        ok: false;
        error: string;
    };

async function loadHistoryDetail(sessionId: string): Promise<HistoryDetailLoadResult> {
    try {
        const detail = await getQuestionnaireHistoryDetailV2(sessionId);
        if (!canLoadClinicalArtifacts(detail.status)) {
            return {
                ok: true,
                detail,
                results: null,
                summary: null,
                preview: null,
                visibleReviews: [],
                notice: null
            };
        }

        const [resultsResponse, summaryResponse, previewResponse] = await Promise.allSettled([
            getQuestionnaireHistoryResultsV2(sessionId),
            getQuestionnaireClinicalSummaryV2(sessionId),
            getQuestionnaireReportPreviewV2(sessionId)
        ]);

        const results = resultsResponse.status === 'fulfilled' ? resultsResponse.value : null;
        const summary = summaryResponse.status === 'fulfilled' ? summaryResponse.value : null;
        const preview = previewResponse.status === 'fulfilled' ? previewResponse.value : null;
        const visibleReviews = (preview?.professional_reviews ?? []).filter((review) => review.visible_to_guardian !== false);
        const notice =
            summaryResponse.status === 'fulfilled' || resultsResponse.status !== 'fulfilled'
                ? null
                : 'No fue posible generar el informe orientativo en este momento.';

        return {
            ok: true,
            detail,
            results,
            summary,
            preview,
            visibleReviews,
            notice
        };
    } catch (requestError) {
        return {
            ok: false,
            error: mapApiErrorToUserMessage(requestError, 'No fue posible cargar el detalle de esta sesión.')
        };
    }
}

function KeyValueRows({
    data,
    exclude = [],
    includeTechnical = false,
    emptyText
}: Readonly<{
    data: Record<string, unknown> | null;
    exclude?: string[];
    includeTechnical?: boolean;
    emptyText: string;
}>) {
    if (!data) return <p>{emptyText}</p>;
    const rows = buildSafeDisplayRows(data, {
        includeTechnical,
        hiddenFields: exclude,
        includeEmpty: false
    });
    if (rows.length === 0) return <p>{emptyText}</p>;

    return (
        <div className="historial-v2-kv-grid">
            {rows.map((row) => (
                <div key={row.key}>
                    <strong>{normalizeClinicalTextPresentation(row.label, row.label)}</strong>
                    <span>{normalizeClinicalTextPresentation(row.value, row.value)}</span>
                </div>
            ))}
        </div>
    );
}

function BulletList({
    title,
    items,
    emptyText
}: Readonly<{
    title: string;
    items: BulletItem[];
    emptyText: string;
}>) {
    return (
        <div className="historial-v2-section">
            <h3>{title}</h3>
            {items.length === 0 ? (
                <p>{emptyText}</p>
            ) : (
                <ul className="historial-v2-bullet-list">
                    {items.map((item) => (
                        <li key={item.key}>{item.text}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export function HistorialBase({ role }: Readonly<HistorialBaseProps>) {
    const {
        items,
        page,
        pageSize,
        total,
        pages,
        statusFilter,
        loading,
        error,
        setPage,
        setStatusFilter,
        changePageSize,
        reload
    } = useQuestionnaireHistoryV2();

    const [detailSessionId, setDetailSessionId] = useState<string | null>(null);
    const [detailPayload, setDetailPayload] = useState<QuestionnaireHistoryDetailV2DTO | null>(null);
    const [resultsPayload, setResultsPayload] = useState<QuestionnaireSecureResultsV2DTO | null>(null);
    const [clinicalSummaryPayload, setClinicalSummaryPayload] = useState<QuestionnaireClinicalSummaryV2DTO | null>(null);
    const [reportPreviewPayload, setReportPreviewPayload] = useState<QuestionnaireReportPreviewDTO | null>(null);
    const [visibleProfessionalReviews, setVisibleProfessionalReviews] = useState<QuestionnaireProfessionalReviewDTO[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [detailNotice, setDetailNotice] = useState<string | null>(null);

    const [newTag, setNewTag] = useState('');
    const [newTagColor, setNewTagColor] = useState(defaultTagColor);

    const [tagWorking, setTagWorking] = useState(false);
    const [shareWorking, setShareWorking] = useState(false);
    const [pdfWorking, setPdfWorking] = useState(false);

    const [tagError, setTagError] = useState<string | null>(null);
    const [tagNotice, setTagNotice] = useState<string | null>(null);
    const [shareError, setShareError] = useState<string | null>(null);
    const [shareNotice, setShareNotice] = useState<string | null>(null);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const [pdfNotice, setPdfNotice] = useState<string | null>(null);
    const [shareQuery, setShareQuery] = useState('');
    const [shareLocation, setShareLocation] = useState('');
    const [shareResults, setShareResults] = useState<PsychologistSearchItemDTO[]>([]);
    const [shareSearchLoading, setShareSearchLoading] = useState(false);
    const [selectedPsychologistId, setSelectedPsychologistId] = useState('');

    const title = 'Historial de cuestionarios';
    const historyContextLabel = role === 'psicologo' ? 'psicólogo' : 'padre o tutor';
    const totalPages = Math.max(1, pages);
    const currentPage = Math.min(Math.max(page, 1), totalPages);
    const showFrom = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const showTo = total === 0 ? 0 : Math.min(currentPage * pageSize, total);
    const tags = useMemo(() => detailPayload?.tags ?? [], [detailPayload]);

    const questionnaireIdForShare = useMemo(() => resolveQuestionnaireId(detailPayload), [detailPayload]);

    const internalReferenceRows = useMemo(
        () => resolveSessionMetadataRows(detailPayload, detailSessionId, questionnaireIdForShare),
        [detailPayload, detailSessionId, questionnaireIdForShare]
    );

    const reportViewModel = useMemo(
        () =>
            buildReportViewModel({
                session: detailPayload,
                results: resultsPayload,
                clinicalSummary: clinicalSummaryPayload
            }),
        [clinicalSummaryPayload, detailPayload, resultsPayload]
    );

    const historyRowsContent = (() => {
        if (loading) {
            return <div className="historial-v2-empty">Cargando historial...</div>;
        }

        if (items.length === 0) {
            return <div className="historial-v2-empty">No hay sesiones para mostrar.</div>;
        }

        return items.map((item: QuestionnaireHistoryItemV2DTO, index) => {
            const sessionTitle = resolveSessionTitle(item, index);
            const caseLabel = resolveHistoryCaseLabel(item);
            return (
                <div className="historial-v2-row" key={item.id}>
                    <div className="historial-v2-primary-cell" title={`${sessionTitle}\n${caseLabel}`}>
                        <strong className="historial-v2-primary-title">{sessionTitle}</strong>
                        <span className="historial-v2-case-ref">{caseLabel}</span>
                    </div>
                    <div>{normalizeClinicalTextPresentation(getStatusLabel(item.status), '--')}</div>
                    <div>{normalizeClinicalTextPresentation(getModeLabel(item.mode), '--')}</div>
                    <div>{normalizeClinicalTextPresentation(getRoleLabel(item.role), '--')}</div>
                    <div>{formatDateTimeEsCO(item.created_at)}</div>
                    <div>{formatDateTimeEsCO(item.updated_at)}</div>
                    <div className="historial-v2-actions">
                        <button type="button" className="historial-v2-btn" onClick={() => handleOpenDetail(item.id)}>
                            Ver
                        </button>
                    </div>
                </div>
            );
        });
    })();

    const resetActionMessages = () => {
        setTagError(null);
        setTagNotice(null);
        setShareError(null);
        setShareNotice(null);
        setPdfError(null);
        setPdfNotice(null);
    };

    const openDetail = async (sessionId: string) => {
        if (!sessionId || sessionId.trim().length === 0) {
            setDetailError('No se encontró una referencia válida para esta sesión.');
            return;
        }

        setDetailSessionId(sessionId);
        setDetailLoading(true);
        setDetailError(null);
        setDetailNotice(null);
        setReportPreviewPayload(null);
        setVisibleProfessionalReviews([]);
        setClinicalSummaryPayload(null);
        resetActionMessages();

        const detailLoad = await loadHistoryDetail(sessionId);
        if (!detailLoad.ok) {
            setDetailError(detailLoad.error);
            setDetailPayload(null);
            setResultsPayload(null);
            setClinicalSummaryPayload(null);
            setReportPreviewPayload(null);
            setVisibleProfessionalReviews([]);
            setDetailLoading(false);
            return;
        }

        setDetailPayload(detailLoad.detail);
        setResultsPayload(detailLoad.results);
        setClinicalSummaryPayload(detailLoad.summary);
        setReportPreviewPayload(detailLoad.preview);
        setVisibleProfessionalReviews(detailLoad.visibleReviews);
        setDetailNotice(detailLoad.notice);
        setDetailLoading(false);
    };

    const closeDetail = () => {
        setDetailSessionId(null);
        setDetailPayload(null);
        setResultsPayload(null);
        setClinicalSummaryPayload(null);
        setReportPreviewPayload(null);
        setVisibleProfessionalReviews([]);
        setDetailLoading(false);
        setDetailError(null);
        setDetailNotice(null);
        setNewTag('');
        setNewTagColor(defaultTagColor);
        setTagWorking(false);
        setShareWorking(false);
        setPdfWorking(false);
        setShareQuery('');
        setShareLocation('');
        setShareResults([]);
        setSelectedPsychologistId('');
        resetActionMessages();
    };

    const handleOpenDetail = (nextSessionId: string) => {
        runHistoryTask(() => openDetail(nextSessionId));
    };

    const refreshDetailAfterTagChange = async () => {
        if (!detailSessionId) return;
        const refreshed = await getQuestionnaireHistoryDetailV2(detailSessionId);
        setDetailPayload(refreshed);
        await reload();
    };

    const handleAddTag = async () => {
        if (!detailSessionId || newTag.trim().length === 0) return;
        setTagWorking(true);
        setTagError(null);
        setTagNotice(null);
        try {
            await addQuestionnaireHistoryTagV2(detailSessionId, {
                tag: newTag.trim(),
                color: normalizeTagColor(newTagColor),
                visibility: 'private'
            });
            await refreshDetailAfterTagChange();
            setNewTag('');
            setNewTagColor(defaultTagColor);
            setTagNotice('Etiqueta agregada correctamente.');
        } catch (actionError) {
            setTagError(buildActionErrorMessage(actionError, 'No fue posible agregar la etiqueta.'));
        } finally {
            setTagWorking(false);
        }
    };

    const handleDeleteTag = async (tagId: string) => {
        if (!detailSessionId) return;
        setTagWorking(true);
        setTagError(null);
        setTagNotice(null);
        try {
            await deleteQuestionnaireHistoryTagV2(detailSessionId, tagId);
            await refreshDetailAfterTagChange();
            setTagNotice('Etiqueta eliminada.');
        } catch (actionError) {
            setTagError(buildActionErrorMessage(actionError, 'No fue posible eliminar la etiqueta.'));
        } finally {
            setTagWorking(false);
        }
    };

    const handleSearchPsychologists = async () => {
        setShareSearchLoading(true);
        setShareError(null);
        setShareNotice(null);
        try {
            const response = await searchPsychologistsV2({
                q: shareQuery.trim() || undefined,
                location: shareLocation.trim() || undefined,
                page: 1,
                page_size: 10
            });
            setShareResults(response.items);
            setSelectedPsychologistId('');
        } catch (actionError) {
            setShareResults([]);
            setShareError(buildActionErrorMessage(actionError, 'No se pudo buscar psicólogos registrados.'));
        } finally {
            setShareSearchLoading(false);
        }
    };

    const handleShareWithPsychologist = async () => {
        if (!detailSessionId || !selectedPsychologistId) return;
        setShareWorking(true);
        setShareError(null);
        setShareNotice(null);
        try {
            const payload = await shareQuestionnaireWithPsychologistV2(detailSessionId, {
                grantee_user_id: selectedPsychologistId,
                grant_can_tag: false,
                grant_can_download_pdf: true,
                share_scope: 'session',
                expires_in_hours: 720,
                max_uses: 100
            });
            const grantee = (payload as { grantee?: { full_name?: string | null; username?: string | null } }).grantee;
            const sharedName = normalizeBackendText(grantee?.full_name ?? grantee?.username, 'el psicólogo seleccionado');
            setShareNotice(`La evaluación fue compartida con ${sharedName}.`);
        } catch (actionError) {
            const code = getApiErrorCode(actionError);
            if (code === 'share_target_not_psychologist') {
                setShareError('Solo puedes compartir esta evaluación con psicólogos registrados.');
            } else if (code === 'share_grantee_inactive') {
                setShareError('Este psicólogo no se encuentra activo actualmente.');
            } else if (code === 'share_grantee_not_found') {
                setShareError('No se encontró el psicólogo seleccionado.');
            } else if (code === 'forbidden_history_access') {
                setShareError('No tienes permisos para compartir esta evaluación.');
            } else {
                setShareError('No se pudo compartir la evaluación. Intenta nuevamente.');
            }
        } finally {
            setShareWorking(false);
        }
    };

    const handleDownloadReport = async () => {
        if (!detailSessionId) return;
        setPdfWorking(true);
        setPdfError(null);
        setPdfNotice(null);
        try {
            let nextResults = resultsPayload;
            let nextSummary = clinicalSummaryPayload;
            let nextDetail = detailPayload;
            let nextSessionSnapshot: QuestionnaireSessionV2DTO | null = null;
            let nextQuestions: QuestionnaireQuestionV2DTO[] = [];
            let nextPreview = reportPreviewPayload;

            if (!nextDetail) {
                nextDetail = await getQuestionnaireHistoryDetailV2(detailSessionId);
                setDetailPayload(nextDetail);
            }

            if (!nextResults && canLoadClinicalArtifacts(nextDetail?.status)) {
                try {
                    nextResults = await getQuestionnaireHistoryResultsV2(detailSessionId);
                    setResultsPayload(nextResults);
                } catch {
                    nextResults = null;
                }
            }

            if (!nextSummary && canLoadClinicalArtifacts(nextDetail?.status)) {
                try {
                    nextSummary = await getQuestionnaireClinicalSummaryV2(detailSessionId);
                    setClinicalSummaryPayload(nextSummary);
                } catch {
                    nextSummary = null;
                }
            }

            if (!nextPreview && canLoadClinicalArtifacts(nextDetail?.status)) {
                try {
                    nextPreview = await getQuestionnaireReportPreviewV2(detailSessionId);
                    setReportPreviewPayload(nextPreview);
                    setVisibleProfessionalReviews((nextPreview.professional_reviews ?? []).filter((review) => review.visible_to_guardian !== false));
                } catch {
                    nextPreview = null;
                }
            }

            try {
                const [sessionSnapshot, sessionQuestions] = await Promise.all([
                    getQuestionnaireSessionV2(detailSessionId),
                    getAllQuestionnaireSessionQuestionsV2(detailSessionId)
                ]);
                nextSessionSnapshot = sessionSnapshot;
                nextQuestions = sessionQuestions;
            } catch {
                nextSessionSnapshot = null;
                nextQuestions = [];
            }

            const pdfBlob = await buildQuestionnaireAlertPdf({
                sessionId: detailSessionId,
                results: nextResults,
                clinicalSummary: nextSummary,
                sessionDetail: nextDetail,
                sessionSnapshot: nextSessionSnapshot,
                sessionQuestions: nextQuestions,
                reportPreview: nextPreview,
                professionalReviews: nextPreview?.professional_reviews ?? visibleProfessionalReviews,
                audience: role === 'psicologo' ? 'psychologist' : 'guardian'
            });
            downloadPdfBlob(pdfBlob, buildQuestionnaireAlertPdfFileName(nextSessionSnapshot ?? nextDetail));
            setPdfNotice('PDF descargado correctamente.');
        } catch (actionError) {
            try {
                await generateQuestionnaireHistoryPdfV2(detailSessionId);
                const { blob, filename } = await downloadQuestionnaireHistoryPdfV2(detailSessionId);
                downloadPdfBlob(blob, filename || buildAlertReportFallbackFileName());
                setPdfNotice('No fue posible generar el PDF enriquecido. Se descargó la versión disponible del servidor.');
                setPdfError(null);
            } catch {
                setPdfError(buildActionErrorMessage(actionError, 'No se pudo generar el PDF. Intenta nuevamente.'));
                setPdfNotice(null);
            }
        } finally {
            setPdfWorking(false);
        }
    };

    return (
        <div className="plataforma-view">
            <section className="historial-v2" aria-label={`Historial de cuestionarios para ${historyContextLabel}`}>
                <div className="historial-v2-header">
                    <h1>{title}</h1>
                </div>

                <div className="historial-v2-divider" />

                <div className="historial-v2-controls">
                    <label>
                        Estado
                        <CustomSelect
                            value={statusFilter}
                            options={statusOptions}
                            onChange={setStatusFilter}
                            ariaLabel="Filtrar historial por estado"
                        />
                    </label>
                </div>

                {error ? <div className="historial-v2-alert error">{error}</div> : null}

                <div className="historial-v2-table">
                    <div className="historial-v2-head">
                        <div>Sesión</div>
                        <div>Estado</div>
                        <div>Modo</div>
                        <div>Rol</div>
                        <div>Creado</div>
                        <div>Actualizado</div>
                        <div>Acciones</div>
                    </div>
                    <div className="historial-v2-body">{historyRowsContent}</div>
                </div>

                <div className="historial-v2-pagination">
                    <div>Mostrando {showFrom}-{showTo} de {total}</div>
                    <div className="historial-v2-pagination-right">
                        <label>
                            Tamaño
                            <CustomSelect
                                value={String(pageSize)}
                                options={pageSizeOptions}
                                onChange={(value) => changePageSize(Number(value))}
                                ariaLabel="Cambiar tamaño de página de historial"
                            />
                        </label>
                        <button
                            type="button"
                            className="historial-v2-page-btn"
                            onClick={() => setPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage <= 1}
                            aria-label="Página anterior"
                        >
                            <span className="historial-v2-page-arrow" aria-hidden="true">‹</span>
                        </button>
                        <span>Página {currentPage} de {totalPages}</span>
                        <button
                            type="button"
                            className="historial-v2-page-btn"
                            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage >= totalPages}
                            aria-label="Página siguiente"
                        >
                            <span className="historial-v2-page-arrow" aria-hidden="true">›</span>
                        </button>
                    </div>
                </div>
            </section>

            <Modal isOpen={detailSessionId !== null} onClose={closeDetail}>
                <div className="historial-v2-modal">
                    <h2>Detalle de sesión</h2>
                    {detailLoading ? <div className="historial-v2-empty">Cargando detalle...</div> : null}
                    {detailError ? <div className="historial-v2-alert error">{detailError}</div> : null}
                    {detailNotice ? <div className="historial-v2-alert success">{detailNotice}</div> : null}

                    {!detailLoading && detailPayload ? (
                        <>
                            <div className="historial-v2-detail-list">
                                <div className="historial-v2-detail-item">
                                    <strong>Estado</strong>
                                    <span>{reportViewModel.statusLabel}</span>
                                </div>
                                <div className="historial-v2-detail-item">
                                    <strong>Modo de evaluación</strong>
                                    <span>{reportViewModel.modeLabel}</span>
                                </div>
                                <div className="historial-v2-detail-item">
                                    <strong>Perfil que respondió</strong>
                                    <span>{reportViewModel.roleLabel}</span>
                                </div>
                                <div className="historial-v2-detail-item">
                                    <strong>Última actualización</strong>
                                    <span>{formatDateTimeEsCO(detailPayload.updated_at)}</span>
                                </div>
                            </div>

                            <div className="historial-v2-warning">
                                Este resultado es orientativo y sirve como apoyo de alerta temprana; no constituye diagnóstico clínico definitivo.
                            </div>

                            <div className="historial-v2-section">
                                <h3>Diagnóstico clínico orientativo</h3>
                                {clinicalSummaryPayload ? (
                                    <div className="historial-v2-detail-list">
                                        <div className="historial-v2-detail-item">
                                            <strong>Nivel de alerta</strong>
                                            <span>{reportViewModel.overallRiskLabel}</span>
                                        </div>
                                        <div className="historial-v2-detail-item">
                                            <strong>Generado</strong>
                                            <span>{formatDateTimeEsCO(clinicalSummaryPayload.generated_at)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p>No fue posible cargar el informe orientativo completo para esta sesión.</p>
                                )}

                                {reportViewModel.comorbidityText ? (
                                    <div className="historial-v2-warning">
                                        <strong>Posible coexistencia de señales.</strong> {reportViewModel.comorbidityText}
                                    </div>
                                ) : null}
                            </div>

                            <div className="historial-v2-section">
                                <h3>Síntesis general</h3>
                                {reportViewModel.summaryBlocks.bullets.length > 0 ? (
                                    <>
                                        <p className="historial-v2-section-label">Mayor compatibilidad observada:</p>
                                        <ul className="historial-v2-bullet-list">
                                            {reportViewModel.summaryBlocks.bullets.map((item) => (
                                                <li key={item.key}>{item.domain}: {item.level}.</li>
                                            ))}
                                        </ul>
                                    </>
                                ) : null}
                                {reportViewModel.summaryBlocks.levelText ? (
                                    <p className="historial-v2-text-block">
                                        <strong>Nivel global estimado:</strong> {reportViewModel.summaryBlocks.levelText}.
                                    </p>
                                ) : null}
                                {reportViewModel.summaryBlocks.paragraphs.length > 0 ? (
                                    reportViewModel.summaryBlocks.paragraphs.map((paragraph, index) => (
                                        <p className="historial-v2-text-block" key={`summary-paragraph-${index}`}>
                                            {paragraph}
                                        </p>
                                    ))
                                ) : reportViewModel.summaryBlocks.bullets.length === 0 ? (
                                    <p>No se recibió contenido para esta sección en el informe actual.</p>
                                ) : null}
                            </div>

                            <div className="historial-v2-section">
                                <h3>Niveles de compatibilidad</h3>
                                {reportViewModel.compatibilityItems.length > 0 ? (
                                    <ul className="historial-v2-bullet-list">
                                        {reportViewModel.compatibilityItems.map((item) => (
                                            <li key={item.key}>
                                                {item.text}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p>No se recibió información estructurada de compatibilidad.</p>
                                )}
                            </div>

                            <BulletList
                                title="Indicadores principales observados"
                                items={reportViewModel.indicators}
                                emptyText="No se recibieron indicadores estructurados para esta sesión."
                            />

                            <div className="historial-v2-section">
                                <h3>Impacto funcional</h3>
                                <p className="historial-v2-text-block">{reportViewModel.functionalImpact}</p>
                            </div>

                            <div className="historial-v2-section">
                                <h3>Recomendación profesional</h3>
                                <p className="historial-v2-text-block">{reportViewModel.professionalRecommendation}</p>
                            </div>

                            <div className="historial-v2-section">
                                <h3>Aclaración importante</h3>
                                <p className="historial-v2-text-block">{reportViewModel.clarification}</p>
                                <p className="historial-v2-helper-text">{reportViewModel.disclaimer}</p>
                            </div>

                            <div className="historial-v2-section">
                                <h3>Resultados estructurados complementarios</h3>
                                <KeyValueRows
                                    data={toRecord(resultsPayload?.result ?? resultsPayload)}
                                    exclude={hiddenResultFields}
                                    emptyText="Sin resultados estructurados adicionales."
                                />
                            </div>

                            {reportPreviewPayload ? (
                                <div className="historial-v2-section">
                                    <h3>Vista previa estructurada del reporte</h3>
                                    <p className="historial-v2-helper-text">
                                        Esta vista usa la respuesta segura del reporte para resumir dominios, respuestas normalizadas y revisiones profesionales visibles.
                                    </p>
                                    {reportPreviewPayload.answers.length > 0 ? (
                                        <div className="historial-v2-review-list">
                                            {reportPreviewPayload.answers.slice(0, 8).map((answer, index) => (
                                                <article key={`${answer.question_id ?? answer.question_code ?? index}`} className="historial-v2-review-card">
                                                    <strong>{normalizeBackendText(answer.prompt, 'Pregunta no disponible')}</strong>
                                                    <p><span>Respuesta:</span> {normalizeBackendText(answer.normalized_answer ?? answer.raw_answer_display, '--')}</p>
                                                    <p><span>Dominio:</span> {normalizeBackendText(answer.domain, 'General')} · {normalizeBackendText(answer.section_title, 'General')}</p>
                                                </article>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="historial-v2-helper-text">Sin respuestas estructuradas visibles en la vista previa.</p>
                                    )}
                                    {reportPreviewPayload.disclaimer ? (
                                        <p className="historial-v2-helper-text">{normalizeBackendText(reportPreviewPayload.disclaimer)}</p>
                                    ) : null}
                                </div>
                            ) : null}

                            {internalReferenceRows.length > 0 ? (
                                <div className="historial-v2-section">
                                    <h3>Referencia interna</h3>
                                    <div className="historial-v2-kv-grid">
                                        {internalReferenceRows.map((row) => (
                                            <div key={row.key}>
                                                <strong>{normalizeClinicalTextPresentation(row.label, row.label)}</strong>
                                                <span>{row.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            <div className="historial-v2-section">
                                <h3>Etiquetas</h3>
                                <p className="historial-v2-tag-disclaimer">
                                    Las etiquetas son privadas y solo estarán visibles para ti.
                                </p>
                                {tagError ? <div className="historial-v2-inline-feedback error">{tagError}</div> : null}
                                {tagNotice ? <div className="historial-v2-inline-feedback success">{tagNotice}</div> : null}

                                {tags.length === 0 ? (
                                    <p>Sin etiquetas.</p>
                                ) : (
                                    <div className="historial-v2-tags">
                                        {tags.map((tag) => {
                                            const tagName = normalizeClinicalTextPresentation(tag.label ?? tag.tag, '--');
                                            const tagId = resolveTagId(tag);
                                            const tagColor = normalizeTagColor(tag.color);
                                            const tagKey = tagId || `${tagName}-${tagColor}`;

                                            return (
                                                <div
                                                    className="historial-v2-tag"
                                                    key={tagKey}
                                                    style={{ borderLeftColor: tagColor }}
                                                >
                                                    <span className="historial-v2-tag-name">{tagName}</span>
                                                    {tagId.length > 0 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => { runHistoryTask(() => handleDeleteTag(tagId)); }}
                                                            disabled={tagWorking}
                                                        >
                                                            Eliminar
                                                        </button>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="historial-v2-tag-form">
                                    <input
                                        type="text"
                                        placeholder="Etiqueta"
                                        value={newTag}
                                        onChange={(event) => setNewTag(event.target.value)}
                                    />
                                    <div className="historial-v2-color-palette" role="radiogroup" aria-label="Color de etiqueta">
                                        {tagColorOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                className={`historial-v2-color-swatch ${newTagColor === option.value ? 'is-selected' : ''}`}
                                                role="radio"
                                                aria-checked={newTagColor === option.value}
                                                aria-label={option.label}
                                                title={option.label}
                                                style={{ backgroundColor: option.value }}
                                                onClick={() => setNewTagColor(option.value)}
                                            />
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        className="historial-v2-btn"
                                        onClick={() => { runHistoryTask(handleAddTag); }}
                                        disabled={tagWorking || newTag.trim().length === 0}
                                    >
                                        {tagWorking ? 'Guardando...' : 'Agregar'}
                                    </button>
                                </div>
                            </div>

                            {role === 'padre' ? (
                                <div className="historial-v2-section">
                                    <h3>Compartir con psicólogo</h3>
                                    <div className="historial-v2-actions-card">
                                        <p className="historial-v2-helper-text">
                                            Busca un psicólogo registrado por nombre, correo o ciudad para compartir esta evaluación directamente con su cuenta profesional.
                                        </p>
                                        <div className="historial-v2-share-search-grid">
                                            <input
                                                type="text"
                                                placeholder="Nombre o correo"
                                                value={shareQuery}
                                                onChange={(event) => setShareQuery(event.target.value)}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Ciudad"
                                                value={shareLocation}
                                                onChange={(event) => setShareLocation(event.target.value)}
                                            />
                                            <button
                                                type="button"
                                                className="historial-v2-btn"
                                                onClick={() => { runHistoryTask(handleSearchPsychologists); }}
                                                disabled={shareSearchLoading}
                                            >
                                                {shareSearchLoading ? 'Buscando...' : 'Buscar'}
                                            </button>
                                        </div>
                                        {shareError ? <div className="historial-v2-inline-feedback error">{shareError}</div> : null}
                                        {shareNotice ? <div className="historial-v2-inline-feedback success">{shareNotice}</div> : null}
                                        {shareResults.length === 0 && (shareQuery.trim().length > 0 || shareLocation.trim().length > 0) && !shareSearchLoading ? (
                                            <p className="historial-v2-helper-text">No se encontraron psicólogos con esos criterios.</p>
                                        ) : null}
                                        {shareResults.length > 0 ? (
                                            <div className="historial-v2-psychologist-list">
                                                {shareResults.map((psychologist) => (
                                                    <button
                                                        key={psychologist.user_id}
                                                        type="button"
                                                        className={`historial-v2-psychologist-item ${selectedPsychologistId === psychologist.user_id ? 'is-selected' : ''}`}
                                                        onClick={() => setSelectedPsychologistId(psychologist.user_id)}
                                                    >
                                                        <strong>{normalizeBackendText(psychologist.full_name ?? psychologist.username, 'Psicólogo registrado')}</strong>
                                                        <span>{normalizeBackendText(psychologist.email, 'Correo no disponible')}</span>
                                                        <small>
                                                            {normalizeBackendText(psychologist.professional_location, 'Ubicación no disponible')}
                                                            {psychologist.colpsic_verified ? ' · Verificado' : ''}
                                                        </small>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : null}
                                        <div className="historial-v2-section-actions">
                                            <button
                                                type="button"
                                                className="historial-v2-btn"
                                                onClick={() => { runHistoryTask(handleShareWithPsychologist); }}
                                                disabled={!selectedPsychologistId || shareWorking}
                                            >
                                                {shareWorking ? 'Compartiendo...' : 'Compartir evaluación'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {role === 'padre' ? (
                                <div className="historial-v2-section">
                                    <h3>Observaciones profesionales visibles</h3>
                                    {visibleProfessionalReviews.length > 0 ? (
                                        <div className="historial-v2-review-list">
                                            {visibleProfessionalReviews.map((review) => (
                                                <article key={review.review_id} className="historial-v2-review-card">
                                                    <strong>{normalizeBackendText(review.review_status, 'Observación profesional')}</strong>
                                                    <p><span>Concepto inicial:</span> {normalizeBackendText(review.initial_concept, 'Sin concepto registrado')}</p>
                                                    <p><span>Recomendación profesional:</span> {normalizeBackendText(review.recommendation, 'Sin recomendación registrada')}</p>
                                                </article>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="historial-v2-helper-text">Sin revisiones profesionales visibles para esta sesión.</p>
                                    )}
                                </div>
                            ) : null}

                            <div className="historial-v2-section">
                                <h3>Reporte PDF</h3>
                                <div className="historial-v2-actions-card">
                                    <p className="historial-v2-helper-text">
                                        Genera y descarga la versión enriquecida del reporte con preguntas respondidas, revisiones visibles y gráficas interpretativas.
                                    </p>
                                    {pdfNotice ? <div className="historial-v2-inline-feedback success">{pdfNotice}</div> : null}
                                    {pdfError ? <div className="historial-v2-inline-feedback error">{pdfError}</div> : null}
                                    <div className="historial-v2-section-actions">
                                        <button
                                            type="button"
                                            className="historial-v2-btn"
                                            onClick={() => { runHistoryTask(handleDownloadReport); }}
                                            disabled={pdfWorking}
                                        >
                                            {pdfWorking ? 'Generando PDF...' : 'Descargar PDF'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : null}

                    <div className="historial-v2-modal-actions">
                        <button type="button" className="historial-v2-btn" onClick={closeDetail}>
                            Cerrar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
