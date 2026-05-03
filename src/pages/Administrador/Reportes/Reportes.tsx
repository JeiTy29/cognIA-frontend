import { useMemo, useState } from 'react';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { Modal } from '../../../components/Modal/Modal';
import { useAdminProblemReports } from '../../../hooks/useAdminProblemReports';
import {
    PROBLEM_REPORT_ISSUE_TYPES,
    PROBLEM_REPORT_STATUSES,
    getProblemReportIssueTypeLabel,
    getProblemReportReporterRoleLabel,
    getProblemReportStatusLabel,
    type ProblemReportStatus
} from '../../../services/problemReports/problemReports.types';
import {
    buildSafeDisplayRows,
    formatDateTimeEsCO,
    formatFileSizeEs,
    getMimeTypeLabel,
    getSourceModuleLabel
} from '../../../utils/presentation/naturalLanguage';
import '../AdminShared.css';
import './Reportes.css';

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

const reporterRoleOptions = [
    { value: '', label: 'Todos' },
    { value: 'ADMIN', label: 'Administrador' },
    { value: 'PSYCHOLOGIST', label: 'PsicÃ³logo' },
    { value: 'GUARDIAN', label: 'Padre/Tutor' }
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
    return formatDateTimeEsCO(value);
}

function getStatusBadgeClass(value: string) {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'resolved') return 'ok';
    if (normalized === 'triaged' || normalized === 'in_progress') return 'pending';
    if (normalized === 'rejected') return 'rejected';
    return 'neutral';
}

function swallowReportActionError() {
    return undefined;
}

export default function ReportesAdmin() {
    const {
        items,
        page,
        pageSize,
        total,
        pages,
        query,
        statusFilter,
        issueTypeFilter,
        reporterRoleFilter,
        fromDateFilter,
        toDateFilter,
        sort,
        order,
        loading,
        error,
        notice,
        loadingDetail,
        detailItem,
        submittingUpdate,
        setPage,
        setQuery,
        setStatusFilter,
        setIssueTypeFilter,
        setReporterRoleFilter,
        setFromDateFilter,
        setToDateFilter,
        setOrdering,
        changePageSize,
        fetchDetail,
        updateReport,
        clearMessages,
        clearDetail
    } = useAdminProblemReports();

    const [statusForm, setStatusForm] = useState<string>(PROBLEM_REPORT_STATUSES[0]);
    const [adminNotesForm, setAdminNotesForm] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

    const currentPage = Math.min(page, Math.max(1, pages));
    const displayFrom = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const displayTo = total === 0 ? 0 : Math.min(currentPage * pageSize, total);
    const orderValue = useMemo(() => `${sort}:${order}`, [sort, order]);

    const openDetail = async (reportId: string) => {
        clearMessages();
        setFormError(null);
        const detail = await fetchDetail(reportId);
        if (detail) {
            setStatusForm(detail.status);
            setAdminNotesForm(detail.admin_notes ?? '');
        }
    };

    const closeDetail = () => {
        clearDetail();
        setStatusForm(PROBLEM_REPORT_STATUSES[0]);
        setAdminNotesForm('');
        setFormError(null);
    };

    const handleSubmitUpdate = async () => {
        if (!detailItem) return;

        const payload: { status?: ProblemReportStatus; admin_notes?: string } = {};
        const trimmedNotes = adminNotesForm.trim();
        const initialNotes = (detailItem.admin_notes ?? '').trim();

        if (statusForm !== detailItem.status) {
            payload.status = statusForm as ProblemReportStatus;
        }
        if (trimmedNotes !== initialNotes) {
            payload.admin_notes = adminNotesForm;
        }

        if (!payload.status && payload.admin_notes === undefined) {
            setFormError('Debes realizar al menos un cambio.');
            return;
        }

        setFormError(null);
        const updated = await updateReport(detailItem.id, payload);
        if (updated) {
            setStatusForm(updated.status);
            setAdminNotesForm(updated.admin_notes ?? '');
        }
    };

    const renderTableContent = () => {
        if (loading) {
            return <div className="admin-loading">Cargando reportes...</div>;
        }

        if (items.length === 0) {
            return (
                <div className="admin-empty" role="status">
                    <div className="admin-empty-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M5 4h14v16H5V4Zm2 2v12h10V6H7Zm2 2h6v2H9V8Zm0 4h6v2H9v-2Zm0 4h4v2H9v-2Z" /></svg>
                    </div>
                    <h3>Sin reportes</h3>
                    <p>No hay registros para los filtros actuales.</p>
                </div>
            );
        }

        return (
            <div className="admin-table-body">
                {items.map((item) => (
                    <div key={item.id} className="admin-row reportes-admin-grid">
                        <div className="reportes-admin-code">{item.report_code}</div>
                        <div>{getProblemReportIssueTypeLabel(item.issue_type)}</div>
                        <div>
                            <span className={`admin-status-badge ${getStatusBadgeClass(item.status)}`}>
                                {getProblemReportStatusLabel(item.status)}
                            </span>
                        </div>
                        <div>{getProblemReportReporterRoleLabel(item.reporter_role)}</div>
                        <div>{getSourceModuleLabel(item.source_module)}</div>
                        <div>{formatDateTime(item.created_at)}</div>
                        <div>
                            <button
                                type="button"
                                className="admin-btn ghost reportes-admin-action-btn"
                                onClick={() => {
                                    openDetail(item.id).catch(swallowReportActionError);
                                }}
                            >
                                Detalle
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="admin-page reportes-admin-page">
            <header className="admin-header">
                <div className="admin-title">
                    <h1>Reportes</h1>
                </div>
            </header>

            <div className="admin-divider" aria-hidden="true" />

            {notice ? <div className="admin-alert success">{notice}</div> : null}
            {error ? <div className="admin-alert error">{error}</div> : null}

            <section className="admin-controls" aria-label="Controles de reportes">
                <div className="admin-search">
                    <span className="admin-search-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M11 4a7 7 0 1 1-4.95 11.95l-3.5 3.5 1.4 1.4 3.5-3.5A7 7 0 0 1 11 4Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" /></svg>
                    </span>
                    <input
                        type="search"
                        placeholder="Buscar por cÃ³digo, mÃ³dulo o descripciÃ³n"
                        aria-label="Buscar reportes"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                    />
                </div>

                <div className="admin-filters">
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
                        <span>Reportante</span>
                        <CustomSelect
                            ariaLabel="Filtrar por rol del reportante"
                            value={reporterRoleFilter}
                            options={reporterRoleOptions}
                            onChange={setReporterRoleFilter}
                        />
                    </label>

                    <label>
                        <span>Desde</span>
                        <input
                            className="reportes-admin-filter-input"
                            type="date"
                            value={fromDateFilter}
                            onChange={(event) => setFromDateFilter(event.target.value)}
                        />
                    </label>

                    <label>
                        <span>Hasta</span>
                        <input
                            className="reportes-admin-filter-input"
                            type="date"
                            value={toDateFilter}
                            onChange={(event) => setToDateFilter(event.target.value)}
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

            <section className="admin-table" aria-label="Listado de reportes">
                <div className="admin-table-head reportes-admin-grid">
                    <span>CÃ³digo</span>
                    <span>Tipo</span>
                    <span>Estado</span>
                    <span>Reportante</span>
                    <span>MÃ³dulo</span>
                    <span>Fecha</span>
                    <span>Acciones</span>
                </div>

                {renderTableContent()}
            </section>

            <footer className="admin-pagination" aria-label="PaginaciÃ³n de reportes">
                <div>
                    Mostrando {displayFrom}-{displayTo} de {total}
                </div>
                <div className="admin-pagination-controls">
                    <button
                        type="button"
                        className="admin-page-nav-btn"
                        aria-label="PÃ¡gina anterior"
                        onClick={() => setPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage <= 1}
                    >
                        <svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7" /></svg>
                    </button>
                    <span className="admin-page-current">PÃ¡gina {currentPage}</span>
                    <button
                        type="button"
                        className="admin-page-nav-btn"
                        aria-label="PÃ¡gina siguiente"
                        onClick={() => setPage(Math.min(pages, currentPage + 1))}
                        disabled={currentPage >= pages}
                    >
                        <svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" /></svg>
                    </button>
                </div>
                <div className="admin-page-size">
                    <label>
                        <span>TamaÃ±o</span>
                        <CustomSelect
                            ariaLabel="TamaÃ±o de pÃ¡gina"
                            value={String(pageSize)}
                            options={pageSizeOptions}
                            onChange={(value) => changePageSize(Number(value))}
                        />
                    </label>
                </div>
            </footer>

            <Modal isOpen={detailItem !== null || loadingDetail} onClose={closeDetail}>
                <div className="admin-modal reportes-admin-detail">
                    <h2>Detalle del reporte</h2>

                    {loadingDetail ? (
                        <div className="admin-loading">Cargando detalle...</div>
                    ) : detailItem ? (
                        <>
                            <div className="admin-detail-list">
                                <div className="admin-detail-row">
                                    <strong>CÃ³digo</strong>
                                    <span>{detailItem.report_code}</span>
                                </div>
                                <div className="admin-detail-row">
                                    <strong>Tipo</strong>
                                    <span>{getProblemReportIssueTypeLabel(detailItem.issue_type)}</span>
                                </div>
                                <div className="admin-detail-row">
                                    <strong>Estado</strong>
                                    <span>{getProblemReportStatusLabel(detailItem.status)}</span>
                                </div>
                                <div className="admin-detail-row">
                                    <strong>Reportante</strong>
                                    <span>{getProblemReportReporterRoleLabel(detailItem.reporter_role)}</span>
                                </div>
                                <div className="admin-detail-row">
                                    <strong>MÃ³dulo</strong>
                                    <span>{getSourceModuleLabel(detailItem.source_module)}</span>
                                </div>
                                <div className="admin-detail-row">
                                    <strong>Pantalla o ruta de origen</strong>
                                    <span>{detailItem.source_path ?? '--'}</span>
                                </div>
                                <div className="admin-detail-row">
                                    <strong>Creado</strong>
                                    <span>{formatDateTime(detailItem.created_at)}</span>
                                </div>
                                <div className="admin-detail-row">
                                    <strong>Actualizado</strong>
                                    <span>{formatDateTime(detailItem.updated_at)}</span>
                                </div>
                                <div className="admin-detail-row">
                                    <strong>Resuelto</strong>
                                    <span>{formatDateTime(detailItem.resolved_at)}</span>
                                </div>
                            </div>

                            <label>
                                <span>DescripciÃ³n</span>
                                <textarea value={detailItem.description} readOnly />
                            </label>

                            {detailItem.attachments.length > 0 ? (
                                <div className="reportes-admin-attachments">
                                    <strong>Adjuntos</strong>
                                    <div className="reportes-admin-attachments-list">
                                        {detailItem.attachments.map((attachment) => (
                                            <div key={attachment.attachment_id} className="reportes-admin-attachment-row">
                                                <span>{attachment.original_filename}</span>
                                                <span>{getMimeTypeLabel(attachment.mime_type, attachment.mime_type)}</span>
                                                <span>{formatFileSizeEs(attachment.size_bytes)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            {detailItem.metadata && Object.keys(detailItem.metadata).length > 0 ? (
                                <div className="admin-detail-list">
                                    {buildSafeDisplayRows(detailItem.metadata, {
                                        includeTechnical: false,
                                        includeEmpty: false
                                    }).map((row) => (
                                        <div className="admin-detail-row" key={row.key}>
                                            <strong>{row.label}</strong>
                                            <span>{row.value}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : null}

                            <label>
                                <span>Estado</span>
                                <CustomSelect
                                    ariaLabel="Seleccionar nuevo estado"
                                    value={statusForm}
                                    options={PROBLEM_REPORT_STATUSES.map((status) => ({
                                        value: status,
                                        label: getProblemReportStatusLabel(status)
                                    }))}
                                    onChange={(value) => setStatusForm(value)}
                                />
                            </label>

                            <label>
                                <span>Notas admin</span>
                                <textarea
                                    value={adminNotesForm}
                                    onChange={(event) => setAdminNotesForm(event.target.value)}
                                />
                            </label>

                            {formError ? <div className="admin-alert error">{formError}</div> : null}
                        </>
                    ) : null}

                    <div className="admin-modal-actions">
                        <button type="button" className="admin-btn ghost" onClick={closeDetail}>
                            Cerrar
                        </button>
                        <button
                            type="button"
                            className="admin-btn primary"
                            onClick={() => {
                                handleSubmitUpdate().catch(swallowReportActionError);
                            }}
                            disabled={loadingDetail || !detailItem || submittingUpdate}
                        >
                            {submittingUpdate ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

