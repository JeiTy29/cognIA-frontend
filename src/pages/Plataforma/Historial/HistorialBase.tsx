import { useMemo, useState } from 'react';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { Modal } from '../../../components/Modal/Modal';
import { useQuestionnaireHistoryV2 } from '../../../hooks/questionnaires/useQuestionnaireHistoryV2';
import {
    addQuestionnaireHistoryTagV2,
    deleteQuestionnaireHistoryTagV2,
    downloadQuestionnaireHistoryPdfV2,
    generateQuestionnaireHistoryPdfV2,
    getQuestionnaireHistoryDetailV2,
    getQuestionnaireHistoryPdfV2,
    getQuestionnaireHistoryResultsV2,
    shareQuestionnaireHistoryV2
} from '../../../services/questionnaires/questionnaires.api';
import type {
    QuestionnaireHistoryDetailV2DTO,
    QuestionnaireHistoryItemV2DTO,
    QuestionnairePdfInfoV2DTO,
    QuestionnaireShareResponseDTO,
    QuestionnaireTagDTO,
    QuestionnaireTagVisibility
} from '../../../services/questionnaires/questionnaires.types';
import {
    buildSafeDisplayRows,
    formatDateTimeEsCO,
    getModeLabel,
    getRoleLabel,
    getStatusLabel,
    mapApiErrorToUserMessage
} from '../../../utils/presentation/naturalLanguage';
import './HistorialBase.css';

type HistorialRole = 'padre' | 'psicologo';

interface HistorialBaseProps {
    role: HistorialRole;
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

const tagVisibilityOptions = [
    { value: 'private', label: 'Privado' },
    { value: 'shared', label: 'Compartido' }
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

const hiddenShareFields = [
    'id',
    'url',
    'share_url',
    'public_url',
    'link',
    'shared_url',
    'shared_path',
    'share_code',
    'questionnaire_id',
    'session_id',
    'mode_key'
];

const hiddenPdfFields = [
    'id',
    'download_url',
    'file_id',
    'mime_type',
    'session_id',
    'questionnaire_id'
];

function getString(value: unknown, fallback = '--') {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
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

function getTagVisibilityLabel(visibility: string | null | undefined) {
    const normalized = (visibility ?? '').toLowerCase();
    if (normalized === 'private') return 'Privado';
    if (normalized === 'shared') return 'Compartido';
    return '--';
}

function normalizeTagColor(color: string | null | undefined) {
    const value = (color ?? '').trim();
    if (!value) return defaultTagColor;
    return value;
}

function buildActionErrorMessage(error: unknown, fallback: string) {
    return mapApiErrorToUserMessage(error, fallback);
}

function resolveQuestionnaireId(
    detail: QuestionnaireHistoryDetailV2DTO | null,
    sharePayload: QuestionnaireShareResponseDTO | null
) {
    const fromShare = sharePayload?.questionnaire_id;
    if (typeof fromShare === 'string' && fromShare.trim().length > 0) return fromShare.trim();

    const candidates: unknown[] = [
        detail?.questionnaire_id,
        detail?.questionnaire_template_id
    ];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            return candidate.trim();
        }
    }

    return null;
}

function downloadBlob(blob: Blob, filename: string) {
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(href);
}

function getPdfStatusLabel(status: string | undefined) {
    const normalized = (status ?? '').trim().toLowerCase();
    if (!normalized) return 'Sin generar';
    if (['ready', 'completed', 'generated', 'available', 'done'].includes(normalized)) return 'Listo para descargar';
    if (['pending', 'queued', 'requested'].includes(normalized)) return 'En preparación';
    if (['processing', 'running', 'building'].includes(normalized)) return 'Generándose';
    if (['failed', 'error'].includes(normalized)) return 'Error en generación';
    return status ?? '--';
}

function resolveSessionTitle(item: QuestionnaireHistoryItemV2DTO, index: number) {
    const named = getString(item.title ?? item.name, '');
    if (named) return named;
    const mode = getModeLabel(item.mode, '');
    const status = getStatusLabel(item.status, '');
    if (mode && status) return `${mode} · ${status}`;
    return `Registro ${index + 1}`;
}

function KeyValueRows({
    data,
    exclude = [],
    includeTechnical = false,
    emptyText
}: {
    data: Record<string, unknown> | null;
    exclude?: string[];
    includeTechnical?: boolean;
    emptyText: string;
}) {
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
                    <strong>{row.label}</strong>
                    <span>{row.value}</span>
                </div>
            ))}
        </div>
    );
}

export function HistorialBase({ role }: HistorialBaseProps) {
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
    const [resultsPayload, setResultsPayload] = useState<Record<string, unknown> | null>(null);
    const [pdfPayload, setPdfPayload] = useState<QuestionnairePdfInfoV2DTO | null>(null);
    const [sharePayload, setSharePayload] = useState<QuestionnaireShareResponseDTO | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [detailNotice, setDetailNotice] = useState<string | null>(null);

    const [newTag, setNewTag] = useState('');
    const [newTagColor, setNewTagColor] = useState(defaultTagColor);
    const [newTagVisibility, setNewTagVisibility] = useState<QuestionnaireTagVisibility>('private');

    const [shareExpiresHours, setShareExpiresHours] = useState('24');
    const [shareMaxUses, setShareMaxUses] = useState('');
    const [shareGranteeUserId, setShareGranteeUserId] = useState('');
    const [shareUrl, setShareUrl] = useState<string | null>(null);

    const title = role === 'psicologo' ? 'Historial de cuestionarios' : 'Historial de cuestionarios';
    const totalPages = Math.max(1, pages);
    const currentPage = Math.min(Math.max(page, 1), totalPages);
    const showFrom = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const showTo = total === 0 ? 0 : Math.min(currentPage * pageSize, total);
    const tags = useMemo(() => detailPayload?.tags ?? [], [detailPayload]);

    const questionnaireIdForShare = useMemo(
        () => resolveQuestionnaireId(detailPayload, sharePayload),
        [detailPayload, sharePayload]
    );

    const internalReferenceRows = useMemo(
        () =>
            buildSafeDisplayRows(
                {
                    session_id: detailPayload?.id ?? detailSessionId,
                    questionnaire_id: questionnaireIdForShare,
                    mode_key: detailPayload?.mode_key ?? null,
                    share_code: sharePayload?.share_code ?? null
                },
                {
                    includeTechnical: true,
                    includeEmpty: false,
                    customLabels: {
                        session_id: 'ID de sesión',
                        questionnaire_id: 'ID de cuestionario',
                        mode_key: 'Clave interna de modo',
                        share_code: 'Código de acceso compartido'
                    }
                }
            ),
        [detailPayload?.id, detailPayload?.mode_key, detailSessionId, questionnaireIdForShare, sharePayload?.share_code]
    );

    const isPdfReady = useMemo(() => {
        if (!pdfPayload) return false;
        const status = getString(pdfPayload.status, '').toLowerCase();
        if (!status) return false;
        return ['ready', 'completed', 'generated', 'available', 'done'].includes(status);
    }, [pdfPayload]);

    const shareLink = shareUrl ?? sharePayload?.shared_url ?? sharePayload?.shared_path ?? null;
    const shareAvailable = useMemo(() => Boolean(shareLink), [shareLink]);
    const pdfStatusText = useMemo(() => getPdfStatusLabel(pdfPayload?.status), [pdfPayload]);

    const openDetail = async (sessionId: string) => {
        if (!sessionId || sessionId.trim().length === 0) {
            setDetailError('No se encontró una referencia válida para esta sesión.');
            return;
        }
        setDetailSessionId(sessionId);
        setDetailLoading(true);
        setDetailError(null);
        setDetailNotice(null);
        setShareUrl(null);
        setSharePayload(null);
        setPdfPayload(null);
        try {
            const [detailResponse, resultsResponse] = await Promise.all([
                getQuestionnaireHistoryDetailV2(sessionId),
                getQuestionnaireHistoryResultsV2(sessionId)
            ]);
            setDetailPayload(detailResponse);
            setResultsPayload(resultsResponse);
        } catch (requestError) {
            setDetailError(mapApiErrorToUserMessage(requestError, 'No fue posible cargar el detalle de esta sesión.'));
            setDetailPayload(null);
            setResultsPayload(null);
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetail = () => {
        setDetailSessionId(null);
        setDetailPayload(null);
        setResultsPayload(null);
        setPdfPayload(null);
        setSharePayload(null);
        setDetailLoading(false);
        setDetailError(null);
        setDetailNotice(null);
        setNewTag('');
        setNewTagColor(defaultTagColor);
        setNewTagVisibility('private');
        setShareExpiresHours('24');
        setShareMaxUses('');
        setShareGranteeUserId('');
        setShareUrl(null);
    };

    const handleAddTag = async () => {
        if (!detailSessionId || newTag.trim().length === 0) return;
        try {
            await addQuestionnaireHistoryTagV2(detailSessionId, {
                tag: newTag.trim(),
                color: normalizeTagColor(newTagColor),
                visibility: newTagVisibility
            });
            const refreshed = await getQuestionnaireHistoryDetailV2(detailSessionId);
            setDetailPayload(refreshed);
            setNewTag('');
            setNewTagColor(defaultTagColor);
            setDetailNotice('Etiqueta agregada correctamente.');
            await reload();
        } catch (actionError) {
            setDetailError(buildActionErrorMessage(actionError, 'No fue posible agregar la etiqueta.'));
        }
    };

    const handleDeleteTag = async (tagId: string) => {
        if (!detailSessionId) return;
        try {
            await deleteQuestionnaireHistoryTagV2(detailSessionId, tagId);
            const refreshed = await getQuestionnaireHistoryDetailV2(detailSessionId);
            setDetailPayload(refreshed);
            setDetailNotice('Etiqueta eliminada.');
            await reload();
        } catch (actionError) {
            setDetailError(buildActionErrorMessage(actionError, 'No fue posible eliminar la etiqueta.'));
        }
    };

    const handleGenerateShare = async () => {
        if (!detailSessionId) return;
        try {
            const expiresCandidate = Number(shareExpiresHours);
            const maxUsesCandidate = Number(shareMaxUses);
            const payload = await shareQuestionnaireHistoryV2(detailSessionId, {
                expires_in_hours: Number.isFinite(expiresCandidate) && expiresCandidate > 0 ? expiresCandidate : undefined,
                max_uses: Number.isFinite(maxUsesCandidate) && maxUsesCandidate > 0 ? maxUsesCandidate : undefined,
                grantee_user_id: shareGranteeUserId.trim() || undefined
            });
            setSharePayload(payload);
            const resolvedUrl = payload.shared_url ?? payload.shared_path ?? null;
            setShareUrl(resolvedUrl);
            setDetailNotice(
                resolvedUrl
                    ? 'Enlace compartido generado.'
                    : 'El recurso compartido fue creado, pero no se pudo resolver la URL pública.'
            );
        } catch (actionError) {
            setDetailError(buildActionErrorMessage(actionError, 'No fue posible generar el enlace compartido.'));
        }
    };

    const handleGeneratePdf = async () => {
        if (!detailSessionId) return;
        try {
            await generateQuestionnaireHistoryPdfV2(detailSessionId);
            setDetailNotice('Generación de PDF solicitada correctamente.');
        } catch (actionError) {
            setDetailError(buildActionErrorMessage(actionError, 'No fue posible generar el PDF.'));
        }
    };

    const handleFetchPdfInfo = async () => {
        if (!detailSessionId) return;
        try {
            const payload = await getQuestionnaireHistoryPdfV2(detailSessionId);
            setPdfPayload(payload);
            setDetailNotice('Información de PDF cargada.');
        } catch (actionError) {
            setDetailError(buildActionErrorMessage(actionError, 'No fue posible consultar el estado del PDF.'));
        }
    };

    const handleDownloadPdf = async () => {
        if (!detailSessionId) return;
        try {
            const result = await downloadQuestionnaireHistoryPdfV2(detailSessionId);
            downloadBlob(result.blob, result.filename);
            setDetailNotice('Descarga iniciada.');
        } catch (actionError) {
            setDetailError(buildActionErrorMessage(actionError, 'No fue posible descargar el PDF.'));
        }
    };

    const handleCopyShareLink = async () => {
        if (!shareLink) {
            setDetailError('Aún no hay un enlace compartido disponible para copiar.');
            return;
        }
        try {
            await navigator.clipboard.writeText(shareLink);
            setDetailNotice('Enlace copiado al portapapeles.');
        } catch {
            setDetailError('No fue posible copiar el enlace automáticamente.');
        }
    };

    return (
        <div className="plataforma-view">
            <section className="historial-v2">
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
                    <div className="historial-v2-body">
                        {loading ? (
                            <div className="historial-v2-empty">Cargando historial...</div>
                        ) : items.length === 0 ? (
                            <div className="historial-v2-empty">No hay sesiones para mostrar.</div>
                        ) : (
                            items.map((item: QuestionnaireHistoryItemV2DTO, index) => (
                                <div className="historial-v2-row" key={item.id}>
                                    <div title={resolveSessionTitle(item, index)}>{resolveSessionTitle(item, index)}</div>
                                    <div>{getStatusLabel(item.status)}</div>
                                    <div>{getModeLabel(item.mode)}</div>
                                    <div>{getRoleLabel(item.role)}</div>
                                    <div>{formatDateTimeEsCO(item.created_at)}</div>
                                    <div>{formatDateTimeEsCO(item.updated_at)}</div>
                                    <div className="historial-v2-actions">
                                        <button type="button" className="historial-v2-btn" onClick={() => void openDetail(item.id)}>
                                            Ver
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
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
                        >
                            ‹
                        </button>
                        <span>Página {currentPage} de {totalPages}</span>
                        <button
                            type="button"
                            className="historial-v2-page-btn"
                            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage >= totalPages}
                        >
                            ›
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
                            <div className="historial-v2-modal-grid">
                                <div><strong>Estado</strong><span>{getStatusLabel(getString(detailPayload.status, ''))}</span></div>
                                <div><strong>Modo de evaluación</strong><span>{getModeLabel(getString(detailPayload.mode, ''))}</span></div>
                                <div><strong>Perfil que respondió</strong><span>{getRoleLabel(getString(detailPayload.role, ''))}</span></div>
                                <div><strong>Última actualización</strong><span>{formatDateTimeEsCO(detailPayload.updated_at)}</span></div>
                            </div>

                            <div className="historial-v2-warning">
                                Este resultado es orientativo y sirve como apoyo de alerta temprana; no constituye diagnóstico clínico definitivo.
                            </div>

                            <div className="historial-v2-section">
                                <h3>Resumen de resultados</h3>
                                <KeyValueRows
                                    data={toRecord(resultsPayload)}
                                    exclude={hiddenResultFields}
                                    emptyText="Sin resultados disponibles."
                                />
                            </div>

                            {internalReferenceRows.length > 0 ? (
                                <div className="historial-v2-section">
                                    <h3>Referencia interna</h3>
                                    <div className="historial-v2-kv-grid">
                                        {internalReferenceRows.map((row) => (
                                            <div key={row.key}>
                                                <strong>{row.label}</strong>
                                                <span>{row.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            <div className="historial-v2-section">
                                <h3>Etiquetas</h3>
                                {tags.length === 0 ? <p>Sin etiquetas.</p> : (
                                    <div className="historial-v2-tags">
                                        {tags.map((tag, index) => {
                                            const tagName = getString(tag.label ?? tag.tag, '--');
                                            const tagId = resolveTagId(tag);
                                            const tagColor = normalizeTagColor(tag.color);
                                            const visibilityLabel = getString(tag.visibility_label, getTagVisibilityLabel(tag.visibility));
                                            return (
                                                <div
                                                    className="historial-v2-tag"
                                                    key={`${tagId || index}-${tagName}`}
                                                    style={{ borderLeftColor: tagColor }}
                                                >
                                                    <span className="historial-v2-tag-name">{tagName}</span>
                                                    <span className="historial-v2-tag-meta">{visibilityLabel}</span>
                                                    {tagId !== '' ? (
                                                        <button type="button" onClick={() => void handleDeleteTag(tagId)}>
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
                                    <CustomSelect
                                        value={newTagVisibility}
                                        options={tagVisibilityOptions}
                                        onChange={(value) => setNewTagVisibility(value as QuestionnaireTagVisibility)}
                                        ariaLabel="Visibilidad de etiqueta"
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
                                    <button type="button" className="historial-v2-btn" onClick={() => void handleAddTag()}>
                                        Agregar
                                    </button>
                                </div>
                            </div>

                            <div className="historial-v2-section">
                                <h3>Compartir y documento PDF</h3>

                                <div className="historial-v2-actions-group">
                                    <div className="historial-v2-actions-card">
                                        <h4>Compartir resultado</h4>
                                        <div className="historial-v2-share-form">
                                            <input
                                                type="number"
                                                min={1}
                                                placeholder="Expira en horas"
                                                value={shareExpiresHours}
                                                onChange={(event) => setShareExpiresHours(event.target.value)}
                                            />
                                            <input
                                                type="number"
                                                min={1}
                                                placeholder="Límite de usos (opcional)"
                                                value={shareMaxUses}
                                                onChange={(event) => setShareMaxUses(event.target.value)}
                                            />
                                            <input
                                                type="text"
                                                placeholder="ID de destinatario (opcional)"
                                                value={shareGranteeUserId}
                                                onChange={(event) => setShareGranteeUserId(event.target.value)}
                                            />
                                        </div>
                                        <div className="historial-v2-section-actions">
                                            {!shareAvailable ? (
                                                <button type="button" className="historial-v2-btn" onClick={() => void handleGenerateShare()}>
                                                    Generar enlace para compartir
                                                </button>
                                            ) : (
                                                <>
                                                    <button type="button" className="historial-v2-btn" onClick={() => void handleCopyShareLink()}>
                                                        Copiar enlace
                                                    </button>
                                                    <a
                                                        className="historial-v2-btn historial-v2-btn-link"
                                                        href={shareLink ?? '#'}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        Abrir enlace
                                                    </a>
                                                    <button type="button" className="historial-v2-btn" onClick={() => void handleGenerateShare()}>
                                                        Generar nuevo enlace
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                        {shareAvailable ? (
                                            <div className="historial-v2-share">
                                                <span>Enlace disponible</span>
                                                <a href={shareLink ?? '#'} target="_blank" rel="noreferrer">
                                                    {shareLink}
                                                </a>
                                            </div>
                                        ) : (
                                            <p className="historial-v2-helper-text">Aún no has generado un enlace compartido para esta sesión.</p>
                                        )}
                                        <KeyValueRows
                                            data={toRecord(sharePayload)}
                                            exclude={hiddenShareFields}
                                            emptyText="Sin información adicional del enlace."
                                        />
                                    </div>

                                    <div className="historial-v2-actions-card">
                                        <h4>Documento PDF</h4>
                                        <p className="historial-v2-helper-text">Estado actual: <strong>{pdfStatusText}</strong></p>
                                        <div className="historial-v2-section-actions">
                                            <button type="button" className="historial-v2-btn" onClick={() => void handleGeneratePdf()}>
                                                Generar PDF
                                            </button>
                                            <button type="button" className="historial-v2-btn" onClick={() => void handleFetchPdfInfo()}>
                                                Consultar estado
                                            </button>
                                            <button
                                                type="button"
                                                className="historial-v2-btn"
                                                onClick={() => void handleDownloadPdf()}
                                                disabled={!isPdfReady}
                                            >
                                                Descargar PDF
                                            </button>
                                        </div>
                                        <KeyValueRows
                                            data={toRecord(pdfPayload)}
                                            exclude={hiddenPdfFields}
                                            emptyText="Todavía no hay información del PDF."
                                        />
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
