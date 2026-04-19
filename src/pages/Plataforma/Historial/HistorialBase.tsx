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
    QuestionnaireHistoryItemV2DTO,
    QuestionnaireTagDTO,
    QuestionnaireTagVisibility
} from '../../../services/questionnaires/questionnaires.types';
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
    { value: 'shared', label: 'Compartido' },
];

function getString(value: unknown, fallback = '--') {
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function getDate(value: unknown) {
    if (typeof value !== 'string' || !value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return `${date.toLocaleDateString('es-CO')} ${date.toLocaleTimeString('es-CO')}`;
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

function getModeLabel(mode: string | undefined) {
    const normalized = (mode ?? '').toLowerCase();
    if (normalized === 'short') return 'Corto';
    if (normalized === 'medium') return 'Medio';
    if (normalized === 'complete') return 'Completo';
    return mode ?? '--';
}

function getRoleLabel(role: string | undefined) {
    const normalized = (role ?? '').toLowerCase();
    if (normalized === 'caregiver') return 'Cuidador';
    if (normalized === 'psychologist') return 'Psicólogo';
    return role ?? '--';
}

function toRecord(payload: unknown): Record<string, unknown> | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    return payload as Record<string, unknown>;
}

function extractDetailRecord(payload: unknown): Record<string, unknown> | null {
    const record = toRecord(payload);
    if (!record) return null;
    const preferredKeys = ['item', 'session', 'history', 'questionnaire', 'detail'];
    for (const key of preferredKeys) {
        const value = record[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return value as Record<string, unknown>;
        }
    }
    return record;
}

function extractTags(payload: unknown): QuestionnaireTagDTO[] {
    const detail = extractDetailRecord(payload);
    if (!detail) return [];
    const raw = detail.tags;
    if (!Array.isArray(raw)) return [];
    return raw.filter((value) => value && typeof value === 'object' && !Array.isArray(value)) as QuestionnaireTagDTO[];
}

function resolveShareUrl(payload: unknown, sessionId: string) {
    const record = toRecord(payload);
    if (!record) return null;
    const candidates = [
        record.url,
        record.share_url,
        record.public_url,
        record.link
    ];
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate.trim();
    }
    const shareCodeCandidates = [record.share_code, record.code];
    for (const shareCodeCandidate of shareCodeCandidates) {
        if (typeof shareCodeCandidate === 'string' && shareCodeCandidate.trim().length > 0) {
            return `/cuestionario/compartido/${sessionId}/${shareCodeCandidate.trim()}`;
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

function JsonPreview({ payload }: { payload: unknown }) {
    const value = useMemo(() => {
        try {
            return JSON.stringify(payload, null, 2);
        } catch {
            return '--';
        }
    }, [payload]);
    return <pre className="historial-json">{value}</pre>;
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
    const [detailPayload, setDetailPayload] = useState<unknown>(null);
    const [resultsPayload, setResultsPayload] = useState<unknown>(null);
    const [pdfPayload, setPdfPayload] = useState<unknown>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [detailNotice, setDetailNotice] = useState<string | null>(null);

    const [newTag, setNewTag] = useState('');
    const [newTagColor, setNewTagColor] = useState('');
    const [newTagVisibility, setNewTagVisibility] = useState<QuestionnaireTagVisibility>('private');
    const [shareUrl, setShareUrl] = useState<string | null>(null);

    const title = role === 'psicologo' ? 'Historial de cuestionarios' : 'Historial de cuestionarios';
    const totalPages = Math.max(1, pages);
    const currentPage = Math.min(Math.max(page, 1), totalPages);
    const showFrom = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const showTo = total === 0 ? 0 : Math.min(currentPage * pageSize, total);
    const tags = useMemo(() => extractTags(detailPayload), [detailPayload]);

    const openDetail = async (sessionId: string) => {
        setDetailSessionId(sessionId);
        setDetailLoading(true);
        setDetailError(null);
        setDetailNotice(null);
        setShareUrl(null);
        setPdfPayload(null);
        try {
            const [detailResponse, resultsResponse] = await Promise.all([
                getQuestionnaireHistoryDetailV2(sessionId),
                getQuestionnaireHistoryResultsV2(sessionId)
            ]);
            setDetailPayload(detailResponse);
            setResultsPayload(resultsResponse);
        } catch {
            setDetailError('No fue posible cargar el detalle de la sesión.');
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
        setDetailLoading(false);
        setDetailError(null);
        setDetailNotice(null);
        setNewTag('');
        setNewTagColor('');
        setNewTagVisibility('private');
        setShareUrl(null);
    };

    const handleAddTag = async () => {
        if (!detailSessionId || newTag.trim().length === 0) return;
        try {
            await addQuestionnaireHistoryTagV2(detailSessionId, {
                tag: newTag.trim(),
                color: newTagColor.trim() || undefined,
                visibility: newTagVisibility
            });
            const refreshed = await getQuestionnaireHistoryDetailV2(detailSessionId);
            setDetailPayload(refreshed);
            setNewTag('');
            setNewTagColor('');
            setDetailNotice('Etiqueta agregada correctamente.');
            await reload();
        } catch {
            setDetailError('No fue posible agregar la etiqueta.');
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
        } catch {
            setDetailError('No fue posible eliminar la etiqueta.');
        }
    };

    const handleGenerateShare = async () => {
        if (!detailSessionId) return;
        try {
            const payload = await shareQuestionnaireHistoryV2(detailSessionId, {
                grant_can_tag: true,
                grant_can_download_pdf: true
            });
            const resolvedUrl = resolveShareUrl(payload, detailSessionId);
            setShareUrl(resolvedUrl);
            setDetailNotice(resolvedUrl ? 'Enlace compartido generado.' : 'Se generó el recurso compartido.');
        } catch {
            setDetailError('No fue posible generar el enlace compartido.');
        }
    };

    const handleGeneratePdf = async () => {
        if (!detailSessionId) return;
        try {
            await generateQuestionnaireHistoryPdfV2(detailSessionId);
            setDetailNotice('Generación de PDF solicitada correctamente.');
        } catch {
            setDetailError('No fue posible generar el PDF.');
        }
    };

    const handleFetchPdfInfo = async () => {
        if (!detailSessionId) return;
        try {
            const payload = await getQuestionnaireHistoryPdfV2(detailSessionId);
            setPdfPayload(payload);
            setDetailNotice('Información de PDF cargada.');
        } catch {
            setDetailError('No fue posible consultar el estado del PDF.');
        }
    };

    const handleDownloadPdf = async () => {
        if (!detailSessionId) return;
        try {
            const result = await downloadQuestionnaireHistoryPdfV2(detailSessionId);
            downloadBlob(result.blob, result.filename);
            setDetailNotice('Descarga iniciada.');
        } catch {
            setDetailError('No fue posible descargar el PDF.');
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
                            items.map((item: QuestionnaireHistoryItemV2DTO) => (
                                <div className="historial-v2-row" key={item.id}>
                                    <div title={item.id}>{item.id}</div>
                                    <div>{getStatusLabel(item.status)}</div>
                                    <div>{getModeLabel(item.mode)}</div>
                                    <div>{getRoleLabel(item.role)}</div>
                                    <div>{getDate(item.created_at)}</div>
                                    <div>{getDate(item.updated_at)}</div>
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
                                <div><strong>ID</strong><span>{getString(extractDetailRecord(detailPayload)?.id ?? detailSessionId)}</span></div>
                                <div><strong>Estado</strong><span>{getStatusLabel(getString(extractDetailRecord(detailPayload)?.status, ''))}</span></div>
                                <div><strong>Modo</strong><span>{getModeLabel(getString(extractDetailRecord(detailPayload)?.mode, ''))}</span></div>
                                <div><strong>Rol</strong><span>{getRoleLabel(getString(extractDetailRecord(detailPayload)?.role, ''))}</span></div>
                                <div><strong>Creado</strong><span>{getDate(extractDetailRecord(detailPayload)?.created_at)}</span></div>
                                <div><strong>Actualizado</strong><span>{getDate(extractDetailRecord(detailPayload)?.updated_at)}</span></div>
                            </div>

                            <div className="historial-v2-section">
                                <h3>Resultados</h3>
                                {resultsPayload ? <JsonPreview payload={resultsPayload} /> : <p>Sin resultados disponibles.</p>}
                            </div>

                            <div className="historial-v2-section">
                                <h3>Etiquetas</h3>
                                {tags.length === 0 ? <p>Sin etiquetas.</p> : (
                                    <div className="historial-v2-tags">
                                        {tags.map((tag) => {
                                            const tagName = getString(tag.tag, '--');
                                            const tagId = getString(tag.id, '');
                                            return (
                                                <div className="historial-v2-tag" key={`${tagId}-${tagName}`}>
                                                    <span>{tagName}</span>
                                                    <span>{getString(tag.visibility, '--')}</span>
                                                    <span>{getString(tag.color, '--')}</span>
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
                                    <input
                                        type="text"
                                        placeholder="Color (opcional)"
                                        value={newTagColor}
                                        onChange={(event) => setNewTagColor(event.target.value)}
                                    />
                                    <CustomSelect
                                        value={newTagVisibility}
                                        options={tagVisibilityOptions}
                                        onChange={(value) => setNewTagVisibility(value as QuestionnaireTagVisibility)}
                                        ariaLabel="Visibilidad de etiqueta"
                                    />
                                    <button type="button" className="historial-v2-btn" onClick={() => void handleAddTag()}>
                                        Agregar
                                    </button>
                                </div>
                            </div>

                            <div className="historial-v2-section">
                                <h3>Compartir y PDF</h3>
                                <div className="historial-v2-section-actions">
                                    <button type="button" className="historial-v2-btn" onClick={() => void handleGenerateShare()}>
                                        Generar enlace
                                    </button>
                                    <button type="button" className="historial-v2-btn" onClick={() => void handleGeneratePdf()}>
                                        Generar PDF
                                    </button>
                                    <button type="button" className="historial-v2-btn" onClick={() => void handleFetchPdfInfo()}>
                                        Ver estado PDF
                                    </button>
                                    <button type="button" className="historial-v2-btn" onClick={() => void handleDownloadPdf()}>
                                        Descargar PDF
                                    </button>
                                </div>
                                {shareUrl ? (
                                    <div className="historial-v2-share">
                                        <span>Enlace:</span>
                                        <a href={shareUrl} target="_blank" rel="noreferrer">{shareUrl}</a>
                                    </div>
                                ) : null}
                                {pdfPayload ? <JsonPreview payload={pdfPayload} /> : null}
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
