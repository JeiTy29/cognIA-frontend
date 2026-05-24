import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../Modal/Modal';
import { ColombiaLocationSelect } from '../Location/ColombiaLocationSelect';
import { ApiError } from '../../services/api/httpClient';
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
} from '../../services/questionnaires/questionnaires.api';
import type {
    QuestionnaireClinicalSummaryV2DTO,
    QuestionnaireHistoryDetailV2DTO,
    QuestionnaireProfessionalReviewDTO,
    QuestionnaireQuestionV2DTO,
    QuestionnaireReportPreviewDTO,
    QuestionnaireSecureResultsV2DTO,
    QuestionnaireSessionV2DTO,
    QuestionnaireTagDTO,
    PsychologistSearchItemDTO
} from '../../services/questionnaires/questionnaires.types';
import { buildReportViewModel } from '../../utils/presentation/clinicalReport';
import {
    buildSafeDisplayRows,
    formatDateTimeEsCO,
    mapApiErrorToUserMessage
} from '../../utils/presentation/naturalLanguage';
import { downloadPdfBlob } from '../../utils/presentation/reportPdf';
import { buildQuestionnaireAlertPdf, buildQuestionnaireAlertPdfFileName } from '../../utils/reports/questionnaireAlertPdf';
import {
    normalizeBackendText,
    normalizeReviewStatus
} from '../../utils/questionnaires/presentation';
import { resolveAnsweredQuestionRows } from '../../utils/questionnaires/answeredQuestions';
import { emitNotificationsRefresh } from '../../utils/notifications/events';
import '../../pages/Plataforma/Historial/HistorialBase.css';
import '../Location/ColombiaLocationSelect.css';

export type QuestionnaireReportModalRole = 'padre' | 'psicologo';

interface QuestionnaireReportDetailModalProps {
    isOpen: boolean;
    sessionId: string | null;
    role: QuestionnaireReportModalRole;
    onClose: () => void;
    onDataChanged?: () => Promise<void> | void;
}

interface BulletItem {
    key: string;
    text: string;
}

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
    [/ÃƒÂ¡/g, 'á'],
    [/ÃƒÂ©/g, 'é'],
    [/ÃƒÂ­/g, 'í'],
    [/ÃƒÂ³/g, 'ó'],
    [/ÃƒÂº/g, 'ú'],
    [/ÃƒÂ/g, 'Á'],
    [/Ãƒâ€°/g, 'É'],
    [/ÃƒÂ/g, 'Í'],
    [/Ãƒâ€œ/g, 'Ó'],
    [/ÃƒÅ¡/g, 'Ú'],
    [/ÃƒÂ±/g, 'ñ'],
    [/Ãƒâ€˜/g, 'Ñ'],
    [/Ã‚Â¿/g, '¿'],
    [/Ã‚Â¡/g, '¡'],
    [/Ã¢â‚¬â€œ/g, '–'],
    [/Ã¢â‚¬â€/g, '—'],
    [/Ã¢â‚¬Â¦/g, '…'],
    [/Ã¢â‚¬Â¢/g, '•'],
    [/Ã¢â‚¬Å“/g, '"'],
    [/Ã¢â‚¬Â/g, '"'],
    [/Ã¢â‚¬â„¢/g, "'"],
    [/Ã‚Â·/g, '·'],
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
    if (!value.trim()) return value;
    void TEXT_REPLACEMENTS.length;
    const next = shouldPreserveRawText(value) ? value : replaceKnownDomainsInText(value);
    return normalizeBackendText(next, value);
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

function resolveQuestionnaireId(detail: QuestionnaireHistoryDetailV2DTO | null) {
    const candidates: unknown[] = [detail?.questionnaire_id, detail?.questionnaire_template_id];
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            return candidate.trim();
        }
    }

    return null;
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

export function QuestionnaireReportDetailModal({
    isOpen,
    sessionId,
    role,
    onClose,
    onDataChanged
}: Readonly<QuestionnaireReportDetailModalProps>) {
    const [detailPayload, setDetailPayload] = useState<QuestionnaireHistoryDetailV2DTO | null>(null);
    const [resultsPayload, setResultsPayload] = useState<QuestionnaireSecureResultsV2DTO | null>(null);
    const [clinicalSummaryPayload, setClinicalSummaryPayload] = useState<QuestionnaireClinicalSummaryV2DTO | null>(null);
    const [reportPreviewPayload, setReportPreviewPayload] = useState<QuestionnaireReportPreviewDTO | null>(null);
    const [visibleProfessionalReviews, setVisibleProfessionalReviews] = useState<QuestionnaireProfessionalReviewDTO[]>([]);
    const [sessionQuestionsPreview, setSessionQuestionsPreview] = useState<QuestionnaireQuestionV2DTO[]>([]);
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
    const [shareDepartment, setShareDepartment] = useState('');
    const [shareCity, setShareCity] = useState('');
    const [shareSameLocation, setShareSameLocation] = useState(false);
    const [shareWarnings, setShareWarnings] = useState<string[]>([]);
    const [shareResults, setShareResults] = useState<PsychologistSearchItemDTO[]>([]);
    const [shareSearchLoading, setShareSearchLoading] = useState(false);
    const [selectedPsychologistId, setSelectedPsychologistId] = useState('');

    const tags = useMemo(() => detailPayload?.tags ?? [], [detailPayload]);
    const questionnaireIdForShare = useMemo(() => resolveQuestionnaireId(detailPayload), [detailPayload]);
    const internalReferenceRows = useMemo(
        () => resolveSessionMetadataRows(detailPayload, sessionId, questionnaireIdForShare),
        [detailPayload, questionnaireIdForShare, sessionId]
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
    const previewAnswerRows = useMemo(
        () =>
            resolveAnsweredQuestionRows({
                reportPreview: reportPreviewPayload,
                sessionQuestions: sessionQuestionsPreview,
                sessionDetail: detailPayload
            }),
        [detailPayload, reportPreviewPayload, sessionQuestionsPreview]
    );

    const resetActionMessages = () => {
        setTagError(null);
        setTagNotice(null);
        setShareError(null);
        setShareNotice(null);
        setShareWarnings([]);
        setPdfError(null);
        setPdfNotice(null);
    };

    useEffect(() => {
        if (!isOpen || !sessionId) return;

        let cancelled = false;

        const openDetail = async () => {
            setDetailLoading(true);
            setDetailError(null);
            setDetailNotice(null);
            setReportPreviewPayload(null);
            setVisibleProfessionalReviews([]);
            setClinicalSummaryPayload(null);
            resetActionMessages();

            const detailLoad = await loadHistoryDetail(sessionId);
            if (cancelled) return;

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

        openDetail().catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [isOpen, sessionId]);

    useEffect(() => {
        if (isOpen) return;

        setDetailPayload(null);
        setResultsPayload(null);
        setClinicalSummaryPayload(null);
        setReportPreviewPayload(null);
        setVisibleProfessionalReviews([]);
        setSessionQuestionsPreview([]);
        setDetailLoading(false);
        setDetailError(null);
        setDetailNotice(null);
        setNewTag('');
        setNewTagColor(defaultTagColor);
        setTagWorking(false);
        setShareWorking(false);
        setPdfWorking(false);
        setShareQuery('');
        setShareDepartment('');
        setShareCity('');
        setShareSameLocation(false);
        setShareWarnings([]);
        setShareResults([]);
        setSelectedPsychologistId('');
        resetActionMessages();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !sessionId || !reportPreviewPayload) return;
        let cancelled = false;

        const loadQuestions = async () => {
            try {
                const questions = await getAllQuestionnaireSessionQuestionsV2(sessionId);
                if (!cancelled) {
                    setSessionQuestionsPreview(Array.isArray(questions) ? questions : []);
                }
            } catch {
                if (!cancelled) {
                    setSessionQuestionsPreview([]);
                }
            }
        };

        loadQuestions().catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, [isOpen, reportPreviewPayload, sessionId]);

    const refreshDetailAfterTagChange = async () => {
        if (!sessionId) return;
        const refreshed = await getQuestionnaireHistoryDetailV2(sessionId);
        setDetailPayload(refreshed);
        await onDataChanged?.();
    };

    const handleAddTag = async () => {
        if (!sessionId || newTag.trim().length === 0) return;
        setTagWorking(true);
        setTagError(null);
        setTagNotice(null);
        try {
            await addQuestionnaireHistoryTagV2(sessionId, {
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
        if (!sessionId) return;
        setTagWorking(true);
        setTagError(null);
        setTagNotice(null);
        try {
            await deleteQuestionnaireHistoryTagV2(sessionId, tagId);
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
        setShareWarnings([]);
        try {
            const response = await searchPsychologistsV2({
                q: shareQuery.trim() || undefined,
                department: shareSameLocation ? undefined : (shareDepartment.trim() || undefined),
                city: shareSameLocation ? undefined : (shareCity.trim() || undefined),
                same_location: shareSameLocation || undefined,
                page: 1,
                page_size: 10
            });
            setShareResults(response.items);
            setShareWarnings(response.warnings ?? []);
            setSelectedPsychologistId('');
        } catch (actionError) {
            setShareResults([]);
            setShareWarnings([]);
            setShareError(
                normalizeBackendText(
                    buildActionErrorMessage(actionError, 'No se pudo buscar psicólogos registrados.'),
                    'No se pudo buscar psicólogos registrados.'
                )
            );
        } finally {
            setShareSearchLoading(false);
        }
    };

    const handleShareWithPsychologist = async () => {
        if (!sessionId || !selectedPsychologistId) return;
        setShareWorking(true);
        setShareError(null);
        setShareNotice(null);
        try {
            const payload = await shareQuestionnaireWithPsychologistV2(sessionId, {
                grantee_user_id: selectedPsychologistId,
                grant_can_tag: false,
                grant_can_download_pdf: true,
                share_scope: 'session',
                expires_in_hours: 720,
                max_uses: 100
            });
            const grantee = (payload as { grantee?: { full_name?: string | null; username?: string | null } }).grantee;
            const sharedName = normalizeBackendText(grantee?.full_name ?? grantee?.username, 'el psicólogo seleccionado');
            if (payload.grant?.request_status === 'pending') {
                setShareNotice(
                    `Solicitud enviada a ${sharedName}. El psicólogo podrá revisar la evaluación cuando acepte la solicitud.`
                );
            } else {
                setShareNotice(`La evaluación fue compartida con ${sharedName}.`);
            }
            emitNotificationsRefresh();
        } catch (actionError) {
            const code = getApiErrorCode(actionError);
            if (code === 'share_target_not_psychologist') {
                setShareError('Solo puedes enviar solicitudes a psicólogos registrados.');
            } else if (code === 'share_grantee_inactive') {
                setShareError('Este psicólogo no se encuentra activo actualmente.');
            } else if (code === 'share_grantee_not_found') {
                setShareError('No se encontró el psicólogo seleccionado.');
            } else if (code === 'share_request_already_pending') {
                setShareError('Ya existe una solicitud pendiente para este psicólogo.');
            } else if (code === 'share_request_already_accepted') {
                setShareError('Este psicólogo ya aceptó revisar esta evaluación.');
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
        if (!sessionId) return;
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
                nextDetail = await getQuestionnaireHistoryDetailV2(sessionId);
                setDetailPayload(nextDetail);
            }

            if (!nextResults && canLoadClinicalArtifacts(nextDetail?.status)) {
                try {
                    nextResults = await getQuestionnaireHistoryResultsV2(sessionId);
                    setResultsPayload(nextResults);
                } catch {
                    nextResults = null;
                }
            }

            if (!nextSummary && canLoadClinicalArtifacts(nextDetail?.status)) {
                try {
                    nextSummary = await getQuestionnaireClinicalSummaryV2(sessionId);
                    setClinicalSummaryPayload(nextSummary);
                } catch {
                    nextSummary = null;
                }
            }

            if (!nextPreview && canLoadClinicalArtifacts(nextDetail?.status)) {
                try {
                    nextPreview = await getQuestionnaireReportPreviewV2(sessionId);
                    setReportPreviewPayload(nextPreview);
                    setVisibleProfessionalReviews((nextPreview.professional_reviews ?? []).filter((review) => review.visible_to_guardian !== false));
                } catch {
                    nextPreview = null;
                }
            }

            try {
                const [sessionSnapshot, sessionQuestions] = await Promise.all([
                    getQuestionnaireSessionV2(sessionId),
                    getAllQuestionnaireSessionQuestionsV2(sessionId)
                ]);
                nextSessionSnapshot = sessionSnapshot;
                nextQuestions = sessionQuestions;
            } catch {
                nextSessionSnapshot = null;
                nextQuestions = [];
            }

            const pdfBlob = await buildQuestionnaireAlertPdf({
                sessionId,
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
                await generateQuestionnaireHistoryPdfV2(sessionId);
                const { blob, filename } = await downloadQuestionnaireHistoryPdfV2(sessionId);
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
        <Modal isOpen={isOpen} onClose={onClose}>
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
                                        <li key={item.key}>{item.text}</li>
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
                                {previewAnswerRows.length > 0 ? (
                                    <div className="historial-v2-review-list">
                                        {previewAnswerRows.slice(0, 8).map((answer) => (
                                            <article key={answer.key} className="historial-v2-review-card">
                                                <strong>{answer.questionText}</strong>
                                                <p><span>Respuesta:</span> {answer.answerLabel}</p>
                                                <p><span>Dominio:</span> {answer.domainLabel} · {answer.sectionLabel}</p>
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
                                        Busca un psicólogo registrado por nombre, correo o ubicación para enviarle una solicitud de revisión desde su cuenta profesional.
                                    </p>
                                    <div className="historial-v2-share-search-grid">
                                        <label className="historial-v2-share-field">
                                            <span>Nombre o correo</span>
                                            <input
                                                type="text"
                                                placeholder="Nombre o correo"
                                                value={shareQuery}
                                                onChange={(event) => setShareQuery(event.target.value)}
                                            />
                                        </label>
                                        <ColombiaLocationSelect
                                            value={{ department: shareDepartment, city: shareCity }}
                                            onChange={(nextValue) => {
                                                setShareDepartment(nextValue.department);
                                                setShareCity(nextValue.city);
                                            }}
                                            disabled={shareSameLocation}
                                            departmentLabel="Departamento"
                                            cityLabel="Ciudad"
                                            className="historial-v2-share-location"
                                        />
                                        <label className="historial-v2-inline-toggle">
                                            <input
                                                type="checkbox"
                                                checked={shareSameLocation}
                                                onChange={(event) => {
                                                    const checked = event.target.checked;
                                                    setShareSameLocation(checked);
                                                    if (checked) {
                                                        setShareDepartment('');
                                                        setShareCity('');
                                                    }
                                                }}
                                            />
                                            <span>Buscar psicólogos de mi misma ubicación</span>
                                        </label>
                                        <div className="historial-v2-share-button-wrap">
                                            <button
                                                type="button"
                                                className="historial-v2-btn"
                                                aria-label="Buscar psicólogos"
                                                onClick={() => { runHistoryTask(handleSearchPsychologists); }}
                                                disabled={shareSearchLoading}
                                            >
                                                {shareSearchLoading ? (
                                                    <span>...</span>
                                                ) : (
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                                        <circle cx="11" cy="11" r="6.5" />
                                                        <path d="m16 16 4.5 4.5" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    {shareError ? <div className="historial-v2-inline-feedback error">{shareError}</div> : null}
                                    {shareNotice ? <div className="historial-v2-inline-feedback success">{shareNotice}</div> : null}
                                    {shareWarnings.includes('user_location_missing') ? (
                                        <p className="historial-v2-helper-text">
                                            No tienes una ubicación registrada. Puedes buscar manualmente por departamento y ciudad.
                                        </p>
                                    ) : null}
                                    {shareResults.length === 0 && (shareQuery.trim().length > 0 || shareDepartment.trim().length > 0 || shareCity.trim().length > 0 || shareSameLocation) && !shareSearchLoading ? (
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
                                                        {normalizeBackendText(
                                                            [psychologist.city, psychologist.department].filter(Boolean).join(' · '),
                                                            'Ubicación no disponible'
                                                        )}
                                                        {psychologist.colpsic_verified ? ' · Verificado' : ''}
                                                        {psychologist.same_city ? ' · Misma ciudad' : ''}
                                                        {!psychologist.same_city && psychologist.same_department ? ' · Mismo departamento' : ''}
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
                                            {shareWorking ? 'Enviando solicitud...' : 'Compartir evaluación'}
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
                                                <strong>{normalizeReviewStatus(review.review_status)}</strong>
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
                    <button type="button" className="historial-v2-btn" onClick={onClose}>
                        Cerrar
                    </button>
                </div>
            </div>
        </Modal>
    );
}
