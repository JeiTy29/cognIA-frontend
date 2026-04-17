import { useMemo, useState } from 'react';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { Modal } from '../../../components/Modal/Modal';
import { useMyProblemReports } from '../../../hooks/useMyProblemReports';
import {
    PROBLEM_REPORT_ISSUE_TYPES,
    PROBLEM_REPORT_STATUSES,
    getProblemReportIssueTypeLabel,
    getProblemReportStatusLabel,
    type ProblemReportItem
} from '../../../services/problemReports/problemReports.types';
import '../Plataforma.css';
import './Reportes.css';

type ReportesProps = {
    role: 'padre' | 'psicologo';
};

const statusOptions = [
    { value: '', label: 'Todos' },
    ...PROBLEM_REPORT_STATUSES.map((status) => ({
        value: status,
        label: getProblemReportStatusLabel(status)
    }))
];

const issueTypeOptions = [
    { value: '', label: 'Todos' },
    ...PROBLEM_REPORT_ISSUE_TYPES.map((issueType) => ({
        value: issueType,
        label: getProblemReportIssueTypeLabel(issueType)
    }))
];

const orderOptions = [
    { value: 'created_at:desc', label: 'Recientes' },
    { value: 'created_at:asc', label: 'Antiguos' },
    { value: 'updated_at:desc', label: 'Actualizados' }
];

const pageSizeOptions = [
    { value: '10', label: '10' },
    { value: '20', label: '20' },
    { value: '50', label: '50' }
];

function formatDateTime(value: string | null) {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return `${date.toLocaleDateString('es-CO')} ${date.toLocaleTimeString('es-CO')}`;
}

function getStatusBadgeClass(value: string) {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'resolved') return 'ok';
    if (normalized === 'triaged' || normalized === 'in_progress') return 'pending';
    if (normalized === 'rejected') return 'rejected';
    return 'neutral';
}

function formatAttachmentSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Reportes({ role }: ReportesProps) {
    const {
        items,
        page,
        pageSize,
        total,
        pages,
        statusFilter,
        issueTypeFilter,
        sort,
        order,
        loading,
        error,
        setPage,
        setStatusFilter,
        setIssueTypeFilter,
        setOrdering,
        changePageSize
    } = useMyProblemReports();

    const [selectedItem, setSelectedItem] = useState<ProblemReportItem | null>(null);

    const orderValue = useMemo(() => `${sort}:${order}`, [sort, order]);
    const currentPage = Math.min(page, Math.max(1, pages));
    const displayFrom = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const displayTo = total === 0 ? 0 : Math.min(currentPage * pageSize, total);

    return (
        <div className="plataforma-view reportes-view">
            <div className="info-card reportes-panel">
                <header className="reportes-header">
                    <h1>Mis reportes</h1>
                </header>

                {error ? <div className="reportes-alert error">{error}</div> : null}

                <section className="reportes-controls" aria-label="Filtros de reportes">
                    <div className="reportes-filters">
                        <label>
                            <span>Estado</span>
                            <CustomSelect
                                ariaLabel="Filtrar por estado"
                                value={statusFilter}
                                options={statusOptions}
                                onChange={setStatusFilter}
                            />
                        </label>

                        <label>
                            <span>Tipo</span>
                            <CustomSelect
                                ariaLabel="Filtrar por tipo"
                                value={issueTypeFilter}
                                options={issueTypeOptions}
                                onChange={setIssueTypeFilter}
                            />
                        </label>

                        <label>
                            <span>Orden</span>
                            <CustomSelect
                                ariaLabel="Ordenar reportes"
                                value={orderValue}
                                options={orderOptions}
                                onChange={(value) => {
                                    const [nextSort, nextOrder] = value.split(':');
                                    setOrdering(nextSort, nextOrder === 'asc' ? 'asc' : 'desc');
                                }}
                            />
                        </label>
                    </div>
                </section>

                <section className="reportes-table" aria-label="Listado de mis reportes">
                    <div className="reportes-table-head">
                        <span>Código</span>
                        <span>Tipo</span>
                        <span>Estado</span>
                        <span>Fecha</span>
                        <span>Adjuntos</span>
                        <span>Acciones</span>
                    </div>

                    {loading ? <div className="reportes-loading">Cargando reportes...</div> : null}

                    {!loading && items.length === 0 ? (
                        <div className="reportes-empty">
                            <h3>Sin reportes</h3>
                            <p>No tienes reportes para los filtros actuales.</p>
                        </div>
                    ) : null}

                    {!loading && items.length > 0 ? (
                        <div className="reportes-table-body">
                            {items.map((item) => (
                                <div key={item.id} className="reportes-row">
                                    <div className="reportes-code">{item.report_code}</div>
                                    <div>{getProblemReportIssueTypeLabel(item.issue_type)}</div>
                                    <div>
                                        <span className={`reportes-status ${getStatusBadgeClass(item.status)}`}>
                                            {getProblemReportStatusLabel(item.status)}
                                        </span>
                                    </div>
                                    <div>{formatDateTime(item.created_at)}</div>
                                    <div>{item.attachment_count}</div>
                                    <div>
                                        <button
                                            type="button"
                                            className="reportes-btn ghost"
                                            onClick={() => setSelectedItem(item)}
                                        >
                                            Ver detalle
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </section>

                <footer className="reportes-pagination" aria-label="Paginación de mis reportes">
                    <div>
                        Mostrando {displayFrom}-{displayTo} de {total}
                    </div>
                    <div className="reportes-pagination-controls">
                        <button
                            type="button"
                            className="reportes-page-btn"
                            aria-label="Página anterior"
                            onClick={() => setPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage <= 1}
                        >
                            <svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7" /></svg>
                        </button>
                        <span className="reportes-page-current">Página {currentPage}</span>
                        <button
                            type="button"
                            className="reportes-page-btn"
                            aria-label="Página siguiente"
                            onClick={() => setPage(Math.min(pages, currentPage + 1))}
                            disabled={currentPage >= pages}
                        >
                            <svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" /></svg>
                        </button>
                    </div>
                    <div className="reportes-page-size">
                        <label>
                            <span>Tamaño</span>
                            <CustomSelect
                                ariaLabel="Tamaño de página"
                                value={String(pageSize)}
                                options={pageSizeOptions}
                                onChange={(value) => changePageSize(Number(value))}
                            />
                        </label>
                    </div>
                </footer>
            </div>

            <Modal isOpen={selectedItem !== null} onClose={() => setSelectedItem(null)}>
                <div className="reportes-detail-modal">
                    <h2>Detalle del reporte</h2>
                    {selectedItem ? (
                        <>
                            <div className="reportes-detail-grid">
                                <div><strong>Código</strong><span>{selectedItem.report_code}</span></div>
                                <div><strong>Rol</strong><span>{role === 'psicologo' ? 'Psicólogo' : 'Padre/Tutor'}</span></div>
                                <div><strong>Tipo</strong><span>{getProblemReportIssueTypeLabel(selectedItem.issue_type)}</span></div>
                                <div><strong>Estado</strong><span>{getProblemReportStatusLabel(selectedItem.status)}</span></div>
                                <div><strong>Creado</strong><span>{formatDateTime(selectedItem.created_at)}</span></div>
                                <div><strong>Actualizado</strong><span>{formatDateTime(selectedItem.updated_at)}</span></div>
                                <div><strong>Módulo</strong><span>{selectedItem.source_module ?? '--'}</span></div>
                                <div><strong>Ruta</strong><span>{selectedItem.source_path ?? '--'}</span></div>
                            </div>

                            <div className="reportes-detail-block">
                                <strong>Descripción</strong>
                                <p>{selectedItem.description}</p>
                            </div>

                            {selectedItem.attachments.length > 0 ? (
                                <div className="reportes-detail-block">
                                    <strong>Adjuntos</strong>
                                    <div className="reportes-attachments-list">
                                        {selectedItem.attachments.map((attachment) => (
                                            <div key={attachment.attachment_id} className="reportes-attachment-row">
                                                <span>{attachment.original_filename}</span>
                                                <span>{attachment.mime_type}</span>
                                                <span>{formatAttachmentSize(attachment.size_bytes)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            {selectedItem.admin_notes ? (
                                <div className="reportes-detail-block">
                                    <strong>Notas</strong>
                                    <p>{selectedItem.admin_notes}</p>
                                </div>
                            ) : null}
                        </>
                    ) : null}

                    <div className="reportes-detail-actions">
                        <button type="button" className="reportes-btn ghost" onClick={() => setSelectedItem(null)}>
                            Cerrar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
