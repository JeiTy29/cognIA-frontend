import { useMemo, useState } from 'react';
import {
    DashboardEmptyState,
    DashboardSection,
    MatrixAvailabilityChart
} from '../../../components/DashboardCharts';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { Modal } from '../../../components/Modal/Modal';
import { useAdminProblemReports } from '../../../hooks/useAdminProblemReports';
import { fetchProblemReportsForReport } from '../../../services/admin/adminReportData';
import {
    PROBLEM_REPORT_ISSUE_TYPES,
    PROBLEM_REPORT_STATUSES,
    getProblemReportIssueTypeLabel,
    getProblemReportReporterRoleLabel,
    getProblemReportStatusLabel,
    type ProblemReportItem,
    type ProblemReportStatus
} from '../../../services/problemReports/problemReports.types';
import { downloadProblemReportsReportPdf } from '../../../utils/reports/admin/problemReportsReport';
import {
    buildSafeDisplayRows,
    formatDateTimeEsCO,
    formatFileSizeEs,
    getMimeTypeLabel,
    getSourceModuleLabel,
    normalizeMojibakeText
} from '../../../utils/presentation/naturalLanguage';
import '../AdminShared.css';
import './Reportes.css';

type ProblemReportsReportModalState = {
    status: string;
    module: string;
    limit: '10' | '20' | '50' | '100' | 'all';
    order: 'recent' | 'oldest';
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

const reporterRoleOptions = [
    { value: '', label: 'Todos' },
    { value: 'ADMIN', label: 'Administrador' },
    { value: 'PSYCHOLOGIST', label: 'Psicólogo' },
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

const problemReportReportLimitOptions = [
    { value: '10', label: '10' },
    { value: '20', label: '20' },
    { value: '50', label: '50' },
    { value: '100', label: '100' },
    { value: 'all', label: 'Todos' }
];

const problemReportOrderOptions = [
    { value: 'recent', label: 'Más recientes primero' },
    { value: 'oldest', label: 'Más antiguos primero' }
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

function resolveOrderDirection(value: string): 'asc' | 'desc' {
    return value === 'asc' ? 'asc' : 'desc';
}

function LoadingReports() {
    return <div className="admin-loading">Cargando reportes...</div>;
}

function EmptyReports() {
    return (
        <output className="admin-empty" aria-live="polite">
            <span className="admin-empty-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M5 4h14v16H5V4Zm2 2v12h10V6H7Zm2 2h6v2H9V8Zm0 4h6v2H9v-2Zm0 4h4v2H9v-2Z" /></svg>
            </span>
            <strong>Sin reportes</strong>
            <span>No hay registros para los filtros actuales.</span>
        </output>
    );
}

type ReportRowsProps = Readonly<{
    items: ReturnType<typeof useAdminProblemReports>['items'];
    onOpenDetail: (reportId: string) => void;
}>;

function ReportRows({ items, onOpenDetail }: ReportRowsProps) {
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
                                onOpenDetail(item.id);
                            }}
                        >
                            Detalle
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

function swallowReportActionError() {
    return undefined;
}

const defaultProblemReportsReportModal = (): ProblemReportsReportModalState => ({
    status: '',
    module: '',
    limit: '20',
    order: 'recent'
});

function LoadingDetail() {
    return <div className="admin-loading">Cargando detalle...</div>;
}

type ReportDetailContentProps = Readonly<{
    detailItem: ProblemReportItem;
    statusForm: string;
    adminNotesForm: string;
    formError: string | null;
    onStatusChange: (value: string) => void;
    onNotesChange: (value: string) => void;
}>;

function ReportDetailContent({
    detailItem,
    statusForm,
    adminNotesForm,
    formError,
    onStatusChange,
    onNotesChange
}: ReportDetailContentProps) {
    return (
        <>
            <div className="admin-detail-list">
                <div className="admin-detail-row">
                    <strong>Código</strong>
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
                    <strong>Módulo</strong>
                    <span>{getSourceModuleLabel(detailItem.source_module)}</span>
                </div>
                <div className="admin-detail-row">
                    <strong>Pantalla o ruta de origen</strong>
                    <span>{detailItem.source_path ? normalizeMojibakeText(detailItem.source_path) : '--'}</span>
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
                <span>Descripción</span>
                <textarea value={normalizeMojibakeText(detailItem.description)} readOnly />
            </label>

            {detailItem.attachments.length > 0 ? (
                <div className="reportes-admin-attachments">
                    <strong>Adjuntos</strong>
                    <div className="reportes-admin-attachments-list">
                        {detailItem.attachments.map((attachment: ProblemReportItem['attachments'][number]) => (
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
                    onChange={onStatusChange}
                />
            </label>

            <label>
                <span>Notas admin</span>
                <textarea value={adminNotesForm} onChange={(event) => onNotesChange(event.target.value)} />
            </label>

            {formError ? <div className="admin-alert error">{formError}</div> : null}
        </>
    );
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
    const [reportWorking, setReportWorking] = useState(false);
    const [reportNotice, setReportNotice] = useState<string | null>(null);
    const [reportError, setReportError] = useState<string | null>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportForm, setReportForm] = useState<ProblemReportsReportModalState>(defaultProblemReportsReportModal);

    const currentPage = Math.min(page, Math.max(1, pages));
    const displayFrom = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const displayTo = total === 0 ? 0 : Math.min(currentPage * pageSize, total);
    const orderValue = useMemo(() => `${sort}:${order}`, [sort, order]);
    const sourceModuleOptions = useMemo(() => {
        const modules = Array.from(
            new Set(items.map((item) => item.source_module).filter((value): value is string => Boolean(value)))
        );

        return [
            { value: '', label: 'Todos' },
            ...modules.map((module) => ({ value: module, label: getSourceModuleLabel(module) }))
        ];
    }, [items]);

    const reportAvailabilityRows = useMemo(
        () => ['Usuarios', 'Psic?logos', 'Auditor?a', 'M?tricas', 'Cuestionarios', 'Casos', 'Evaluaciones'],
        []
    );
    const reportAvailabilityColumns = useMemo(() => ['PDF', 'Filtros', 'Gr?ficas', 'Exportaci?n completa'], []);
    const reportAvailabilityValues = useMemo(
        () => [
            { row: 'Usuarios', column: 'PDF', status: 'available' as const, label: 'Disponible' },
            { row: 'Usuarios', column: 'Filtros', status: 'available' as const, label: 'Disponible' },
            { row: 'Usuarios', column: 'Gr?ficas', status: 'available' as const, label: 'Disponible' },
            { row: 'Usuarios', column: 'Exportaci?n completa', status: 'partial' as const, label: 'Parcial' },
            { row: 'Psic?logos', column: 'PDF', status: 'available' as const, label: 'Disponible' },
            { row: 'Psic?logos', column: 'Filtros', status: 'available' as const, label: 'Disponible' },
            { row: 'Psic?logos', column: 'Gr?ficas', status: 'available' as const, label: 'Disponible' },
            { row: 'Psic?logos', column: 'Exportaci?n completa', status: 'partial' as const, label: 'Parcial' },
            { row: 'Auditor?a', column: 'PDF', status: 'available' as const, label: 'Disponible' },
            { row: 'Auditor?a', column: 'Filtros', status: 'available' as const, label: 'Disponible' },
            { row: 'Auditor?a', column: 'Gr?ficas', status: 'available' as const, label: 'Disponible' },
            { row: 'Auditor?a', column: 'Exportaci?n completa', status: 'partial' as const, label: 'Parcial' },
            { row: 'M?tricas', column: 'PDF', status: 'available' as const, label: 'Disponible' },
            { row: 'M?tricas', column: 'Filtros', status: 'partial' as const, label: 'Parcial' },
            { row: 'M?tricas', column: 'Gr?ficas', status: 'available' as const, label: 'Disponible' },
            { row: 'M?tricas', column: 'Exportaci?n completa', status: 'partial' as const, label: 'Parcial' },
            { row: 'Cuestionarios', column: 'PDF', status: 'available' as const, label: 'Disponible' },
            { row: 'Cuestionarios', column: 'Filtros', status: 'available' as const, label: 'Disponible' },
            { row: 'Cuestionarios', column: 'Gr?ficas', status: 'partial' as const, label: 'Parcial' },
            { row: 'Cuestionarios', column: 'Exportaci?n completa', status: 'partial' as const, label: 'Parcial' },
            { row: 'Casos', column: 'PDF', status: 'available' as const, label: 'Disponible' },
            { row: 'Casos', column: 'Filtros', status: 'available' as const, label: 'Disponible' },
            { row: 'Casos', column: 'Gr?ficas', status: 'available' as const, label: 'Disponible' },
            { row: 'Casos', column: 'Exportaci?n completa', status: 'partial' as const, label: 'Parcial' },
            { row: 'Evaluaciones', column: 'PDF', status: 'available' as const, label: 'Disponible' },
            { row: 'Evaluaciones', column: 'Filtros', status: 'available' as const, label: 'Disponible' },
            { row: 'Evaluaciones', column: 'Gr?ficas', status: 'available' as const, label: 'Disponible' },
            { row: 'Evaluaciones', column: 'Exportaci?n completa', status: 'partial' as const, label: 'Parcial' }
        ],
        []
    );

    const handleDownloadReport = async () => {
        setReportWorking(true);
        setReportNotice(null);
        setReportError(null);
        try {
            const result = await fetchProblemReportsForReport({
                limit: reportForm.limit === 'all' ? 'all' : Number(reportForm.limit),
                status: reportForm.status || undefined,
                q: query || undefined,
                fromDate: fromDateFilter || undefined,
                toDate: toDateFilter || undefined,
                sort: 'created_at',
                order: reportForm.order === 'oldest' ? 'asc' : 'desc'
            });

            const filteredByModule = result.items.filter((item) =>
                !reportForm.module || item.source_module === reportForm.module
            );

            await downloadProblemReportsReportPdf({
                items: filteredByModule,
                totalIncluded: filteredByModule.length,
                totalAvailable: result.totalAvailable,
                filters: [
                    `Estado: ${reportForm.status ? getProblemReportStatusLabel(reportForm.status) : 'Todos'}`,
                    `Módulo: ${reportForm.module ? getSourceModuleLabel(reportForm.module) : 'Todos'}`,
                    `Cantidad: ${reportForm.limit === 'all' ? 'Todos' : reportForm.limit}`,
                    `Orden: ${reportForm.order === 'oldest' ? 'Más antiguos primero' : 'Más recientes primero'}`
                ],
                options: {
                    quantityLabel: reportForm.limit === 'all' ? 'Todos' : reportForm.limit,
                    orderLabel: reportForm.order === 'oldest' ? 'Más antiguos primero' : 'Más recientes primero',
                    includeDashboardSummary: true
                }
            });
            setIsReportModalOpen(false);
            setReportNotice('Reporte descargado correctamente.');
        } catch {
            setReportError('No se pudo generar el reporte. Intenta nuevamente.');
        } finally {
            setReportWorking(false);
        }
    };

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

    const handleOpenDetail = (reportId: string) => {
        openDetail(reportId).catch(swallowReportActionError);
    };

    const handleOrderChange = (value: string) => {
        const [nextSort, nextOrder] = value.split(':');
        setOrdering(nextSort, resolveOrderDirection(nextOrder));
    };

    const renderDetailContent = () => {
        if (loadingDetail) return <LoadingDetail />;
        if (!detailItem) return null;
        return (
            <ReportDetailContent
                detailItem={detailItem}
                statusForm={statusForm}
                adminNotesForm={adminNotesForm}
                formError={formError}
                onStatusChange={setStatusForm}
                onNotesChange={setAdminNotesForm}
            />
        );
    };

    const renderTableContent = () => {
        if (loading) return <LoadingReports />;
        if (items.length === 0) return <EmptyReports />;
        return (
            <ReportRows
                items={items}
                onOpenDetail={handleOpenDetail}
            />
        );
    };

    return (
        <div className="admin-page reportes-admin-page">
            <header className="admin-header">
                <div className="admin-title">
                    <h1>Reportes</h1>
                </div>
                <div className="admin-actions">
                    <button
                        type="button"
                        className="admin-btn ghost"
                        onClick={() => setIsReportModalOpen(true)}
                        disabled={reportWorking || loading}
                    >
                        {reportWorking ? 'Generando reporte...' : 'Descargar reporte'}
                    </button>
                </div>
            </header>

            <div className="admin-divider" aria-hidden="true" />

            {notice ? <div className="admin-alert success">{notice}</div> : null}
            {error ? <div className="admin-alert error">{error}</div> : null}
            {reportNotice ? <div className="admin-alert success">{reportNotice}</div> : null}
            {reportError ? <div className="admin-alert error">{reportError}</div> : null}

            <div className="admin-dashboard-grid">
                <DashboardSection
                    title="Disponibilidad de reportes por secci?n"
                    description="Resume las capacidades disponibles por tipo de reporte."
                >
                    <MatrixAvailabilityChart
                        rows={reportAvailabilityRows}
                        columns={reportAvailabilityColumns}
                        values={reportAvailabilityValues}
                        ariaLabel="Disponibilidad de reportes por secci?n"
                    />
                </DashboardSection>
                <DashboardSection
                    title="Reportes generados por fecha"
                    description="Muestra la evoluci?n de reportes generados en el tiempo."
                >
                    <DashboardEmptyState message="No hay historial suficiente de generaci?n de reportes." />
                </DashboardSection>
                <DashboardSection
                    title="Descargas por tipo de reporte"
                    description="Distribuye las descargas seg?n el tipo de reporte."
                >
                    <DashboardEmptyState message="No hay datos reales de descargas por tipo de reporte disponibles en esta vista." />
                </DashboardSection>
                <DashboardSection
                    title="Filtros m?s usados por reporte"
                    description="Permite identificar qu? criterios se usan con mayor frecuencia al generar reportes."
                >
                    <DashboardEmptyState message="No hay datos reales de uso de filtros para generar esta gr?fica." />
                </DashboardSection>
                <DashboardSection
                    title="Estado de generaci?n"
                    description="Permite detectar fallos o abandono en el flujo de generaci?n."
                >
                    <DashboardEmptyState message="No hay datos reales del flujo de generaci?n para esta gr?fica." />
                </DashboardSection>
            </div>

            <section className="admin-controls" aria-label="Controles de reportes">
                <div className="admin-search">
                    <span className="admin-search-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M11 4a7 7 0 1 1-4.95 11.95l-3.5 3.5 1.4 1.4 3.5-3.5A7 7 0 0 1 11 4Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" /></svg>
                    </span>
                    <input
                        type="search"
                        placeholder="Buscar por código, módulo o descripción"
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
                            onChange={handleOrderChange}
                        />
                    </label>
                </div>
            </section>

            <section className="admin-table" aria-label="Listado de reportes">
                <div className="admin-table-head reportes-admin-grid">
                    <span>Código</span>
                    <span>Tipo</span>
                    <span>Estado</span>
                    <span>Reportante</span>
                    <span>Módulo</span>
                    <span>Fecha</span>
                    <span>Acciones</span>
                </div>

                {renderTableContent()}
            </section>

            <footer className="admin-pagination" aria-label="Paginación de reportes">
                <div>
                    Mostrando {displayFrom}-{displayTo} de {total}
                </div>
                <div className="admin-pagination-controls">
                    <button
                        type="button"
                        className="admin-page-nav-btn"
                        aria-label="Página anterior"
                        onClick={() => setPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage <= 1}
                    >
                        <svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7" /></svg>
                    </button>
                    <span className="admin-page-current">Página {currentPage}</span>
                    <button
                        type="button"
                        className="admin-page-nav-btn"
                        aria-label="Página siguiente"
                        onClick={() => setPage(Math.min(pages, currentPage + 1))}
                        disabled={currentPage >= pages}
                    >
                        <svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" /></svg>
                    </button>
                </div>
                <div className="admin-page-size">
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

            <Modal
                isOpen={isReportModalOpen}
                onClose={() => {
                    if (reportWorking) return;
                    setIsReportModalOpen(false);
                }}
            >
                <div className="admin-report-modal">
                    <h2>Configurar reporte de problemas</h2>
                    <p>Selecciona el estado, módulo, cantidad y orden del reporte sin alterar la tabla visible.</p>

                    <div className="admin-report-grid">
                        <label>
                            <span>Estado</span>
                            <CustomSelect
                                ariaLabel="Estado del reporte"
                                value={reportForm.status}
                                options={statusOptions}
                                onChange={(value) => setReportForm((prev) => ({ ...prev, status: value }))}
                            />
                        </label>

                        <label>
                            <span>Módulo</span>
                            <CustomSelect
                                ariaLabel="Módulo del reporte"
                                value={reportForm.module}
                                options={sourceModuleOptions}
                                onChange={(value) => setReportForm((prev) => ({ ...prev, module: value }))}
                            />
                        </label>

                        <label>
                            <span>Cantidad</span>
                            <CustomSelect
                                ariaLabel="Cantidad del reporte"
                                value={reportForm.limit}
                                options={problemReportReportLimitOptions}
                                onChange={(value) =>
                                    setReportForm((prev) => ({ ...prev, limit: value as ProblemReportsReportModalState['limit'] }))
                                }
                            />
                        </label>

                        <label>
                            <span>Orden</span>
                            <CustomSelect
                                ariaLabel="Orden del reporte"
                                value={reportForm.order}
                                options={problemReportOrderOptions}
                                onChange={(value) =>
                                    setReportForm((prev) => ({ ...prev, order: value as ProblemReportsReportModalState['order'] }))
                                }
                            />
                        </label>
                    </div>

                    <div className="admin-report-actions">
                        <button
                            type="button"
                            className="admin-btn ghost"
                            onClick={() => setIsReportModalOpen(false)}
                            disabled={reportWorking}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="admin-btn primary"
                            onClick={() => {
                                handleDownloadReport().catch(swallowReportActionError);
                            }}
                            disabled={reportWorking}
                        >
                            {reportWorking ? 'Generando reporte...' : 'Generar PDF'}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={detailItem !== null || loadingDetail} onClose={closeDetail}>
                <div className="admin-modal reportes-admin-detail">
                    <h2>Detalle del reporte</h2>

                    {renderDetailContent()}

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
