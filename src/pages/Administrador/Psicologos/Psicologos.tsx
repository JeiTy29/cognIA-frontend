import { useEffect, useMemo, useState } from 'react';
import {
    AreaChart,
    DashboardEmptyState,
    DashboardSection,
    DonutChart,
    HeatmapChart,
    TreemapChart,
    WaffleChart
} from '../../../components/DashboardCharts';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { Modal } from '../../../components/Modal/Modal';
import { usePsychologists } from '../../../hooks/usePsychologists';
import type { PsychologistAdminItem } from '../../../hooks/usePsychologists';
import { fetchPsychologistsForReport } from '../../../services/admin/adminReportData';
import type { ReportPsychologistRecord } from '../../../services/admin/adminReportData';
import { buildHeatmapCells, buildMonthlyCountItems, mapCountsToItems } from '../../../utils/dashboard/dashboardData';
import { downloadPsychologistsReportPdf } from '../../../utils/reports/admin/psychologistsReport';
import '../AdminShared.css';
import './Psicologos.css';

type ReviewFilter = 'Todos' | 'Pendientes' | 'Rechazados';
type PsychologistsReportModalState = {
    verification: 'all' | 'pending' | 'approved' | 'rejected';
    accountStatus: 'all' | 'active' | 'inactive';
    limit: '10' | '20' | '50' | '100' | 'all';
    includeProfessionalCard: true;
};

const reviewOptions = [
    { value: 'Todos', label: 'Todos' },
    { value: 'Pendientes', label: 'Pendientes' },
    { value: 'Rechazados', label: 'Rechazados' }
];

const pageSizeOptions = [
    { value: '10', label: '10' },
    { value: '25', label: '25' },
    { value: '50', label: '50' }
];

const psychologistsReportLimitOptions = [
    { value: '10', label: '10' },
    { value: '20', label: '20' },
    { value: '50', label: '50' },
    { value: '100', label: '100' },
    { value: 'all', label: 'Todos' }
];

const psychologistsVerificationOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'approved', label: 'Aprobados' },
    { value: 'rejected', label: 'Rechazados' }
];

const psychologistsAccountStatusOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' }
];

const defaultPsychologistsReportModal = (): PsychologistsReportModalState => ({
    verification: 'all',
    accountStatus: 'all',
    limit: '20',
    includeProfessionalCard: true
});

function formatDate(value: string | null) {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleDateString('es-CO');
}

function getDisplayName(item: Pick<PsychologistAdminItem, 'full_name'> & { username?: string }) {
    return item.full_name && item.full_name.trim().length > 0 ? item.full_name : 'Sin nombre';
}

function formatProfessionalCard(value: string | null | undefined) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return normalized.length > 0 ? normalized : 'Sin registrar';
}

export default function Psicologos() {
    const {
        items,
        loading,
        error,
        notice,
        statusUnavailable,
        submittingApprove,
        submittingReject,
        approvePsychologist,
        rejectPsychologist,
        clearMessages
    } = usePsychologists();

    const [searchTerm, setSearchTerm] = useState('');
    const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('Todos');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [rejectReason, setRejectReason] = useState('');
    const [selectedPsychologist, setSelectedPsychologist] = useState<PsychologistAdminItem | null>(null);
    const [isRejectOpen, setIsRejectOpen] = useState(false);
    const [reportWorking, setReportWorking] = useState(false);
    const [reportNotice, setReportNotice] = useState<string | null>(null);
    const [reportError, setReportError] = useState<string | null>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportForm, setReportForm] = useState<PsychologistsReportModalState>(defaultPsychologistsReportModal);
    const [dashboardSample, setDashboardSample] = useState<ReportPsychologistRecord[]>([]);
    const [dashboardSampleTotal, setDashboardSampleTotal] = useState(0);

    const filteredRows = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        return items.filter((item) => {
            const matchesSearch =
                normalizedSearch.length === 0 ||
                item.username.toLowerCase().includes(normalizedSearch) ||
                item.email.toLowerCase().includes(normalizedSearch) ||
                item.id.toLowerCase().includes(normalizedSearch) ||
                item.professional_card_number?.toLowerCase().includes(normalizedSearch) ||
                getDisplayName(item).toLowerCase().includes(normalizedSearch);

            const matchesReview =
                reviewFilter === 'Todos' ||
                (reviewFilter === 'Pendientes' && item.reviewState === 'pending') ||
                (reviewFilter === 'Rechazados' && item.reviewState === 'rejected');

            return matchesSearch && matchesReview;
        });
    }, [items, reviewFilter, searchTerm]);
    const dashboardNote = useMemo(
        () => (dashboardSampleTotal > dashboardSample.length ? 'Resumen calculado sobre los registros cargados.' : undefined),
        [dashboardSample.length, dashboardSampleTotal]
    );
    const approvalChartItems = useMemo(
        () =>
            mapCountsToItems(
                dashboardSample.reduce((accumulator, item) => {
                    const label = item.reviewState === 'approved' ? 'Aprobados' : item.reviewState === 'rejected' ? 'Rechazados' : 'Pendientes';
                    accumulator.set(label, (accumulator.get(label) ?? 0) + 1);
                    return accumulator;
                }, new Map<string, number>())
            ),
        [dashboardSample]
    );
    const psychologistsByMonth = useMemo(
        () => buildMonthlyCountItems(dashboardSample.map((item) => item.created_at)),
        [dashboardSample]
    );
    const psychologistsByDepartment = useMemo(
        () =>
            mapCountsToItems(
                dashboardSample.reduce((accumulator, item) => {
                    const department = (item as ReportPsychologistRecord & { department?: string | null }).department?.trim() || 'Sin departamento';
                    accumulator.set(department, (accumulator.get(department) ?? 0) + 1);
                    return accumulator;
                }, new Map<string, number>())
            ),
        [dashboardSample]
    );
    const verificationChartItems = useMemo(
        () => [
            { label: 'Verificados', value: dashboardSample.filter((item) => item.colpsic_verified === true).length },
            { label: 'Sin verificación visible', value: dashboardSample.filter((item) => item.colpsic_verified !== true).length }
        ].filter((item) => item.value > 0),
        [dashboardSample]
    );
    const coverageRows = useMemo(
        () => Array.from(new Set(dashboardSample.map((item) => (item as ReportPsychologistRecord & { department?: string | null }).department?.trim() || 'Sin departamento'))),
        [dashboardSample]
    );
    const coverageColumns = useMemo(() => ['Activos', 'Inactivos'], []);
    const coverageCells = useMemo(
        () =>
            buildHeatmapCells(
                dashboardSample.map((item) => ({
                    department: (item as ReportPsychologistRecord & { department?: string | null }).department?.trim() || 'Sin departamento',
                    availability: item.is_active ? 'Activos' : 'Inactivos'
                })),
                coverageRows,
                coverageColumns,
                (entry) => entry.department,
                (entry) => entry.availability
            ),
        [coverageColumns, coverageRows, dashboardSample]
    );

    useEffect(() => {
        let cancelled = false;

        const loadDashboardSample = async () => {
            try {
                const result = await fetchPsychologistsForReport({
                    limit: 100,
                    verification:
                        reviewFilter === 'Todos'
                            ? 'all'
                            : reviewFilter === 'Pendientes'
                                ? 'pending'
                                : 'rejected'
                });
                if (cancelled) return;
                setDashboardSample(result.items);
                setDashboardSampleTotal(result.totalAvailable);
            } catch {
                if (cancelled) return;
                setDashboardSample([]);
                setDashboardSampleTotal(0);
            }
        };

        loadDashboardSample().catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [reviewFilter]);

    const total = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const displayFrom = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const displayTo = total === 0 ? 0 : Math.min(currentPage * pageSize, total);

    const handleApprove = async (item: PsychologistAdminItem) => {
        clearMessages();
        await approvePsychologist(item.id);
    };

    const openRejectModal = (item: PsychologistAdminItem) => {
        clearMessages();
        setSelectedPsychologist(item);
        setRejectReason(item.reviewReason ?? '');
        setIsRejectOpen(true);
    };

    const closeRejectModal = () => {
        setSelectedPsychologist(null);
        setRejectReason('');
        setIsRejectOpen(false);
    };

    const handleRejectConfirm = async () => {
        if (!selectedPsychologist) return;
        const rejected = await rejectPsychologist(selectedPsychologist.id, rejectReason.trim());
        if (rejected) {
            closeRejectModal();
        }
    };

    const handleDownloadReport = async () => {
        setReportWorking(true);
        setReportNotice(null);
        setReportError(null);

        try {
            const result = await fetchPsychologistsForReport({
                limit: reportForm.limit === 'all' ? 'all' : Number(reportForm.limit),
                verification: reportForm.verification,
                isActive:
                    reportForm.accountStatus === 'all'
                        ? undefined
                        : reportForm.accountStatus === 'active'
            });

            await downloadPsychologistsReportPdf({
                items: result.items,
                totalIncluded: result.items.length,
                totalAvailable: result.totalAvailable,
                filters: [
                    `Cantidad: ${reportForm.limit === 'all' ? 'Todos' : reportForm.limit}`,
                    `Verificación: ${reportForm.verification === 'all' ? 'Todos' : reportForm.verification}`,
                    `Estado de cuenta: ${reportForm.accountStatus === 'all' ? 'Todos' : reportForm.accountStatus}`
                ],
                options: {
                    includeDashboardSummary: true,
                    quantityLabel: reportForm.limit === 'all' ? 'Todos' : reportForm.limit
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

    return (
        <div className="admin-page psicologos-page">
            <header className="admin-header">
                <div className="admin-title">
                    <h1>Psicólogos</h1>
                </div>
                <div className="admin-actions">
                    <button
                        type="button"
                        className="admin-btn ghost"
                        onClick={() => setIsReportModalOpen(true)}
                        disabled={reportWorking}
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
            {statusUnavailable ? (
                <div className="admin-alert warning">
                    Se encontraron psicólogos, pero ninguno tenía un estado de revisión visible. Se mostraron como pendientes o rechazados cuando el backend entregó señales compatibles.
                </div>
            ) : null}
            <div className="psicologos-dashboard-grid">
                <DashboardSection
                    title="Estado de aprobación"
                    description="Resume el estado del proceso de validación de psicólogos."
                    note={dashboardNote}
                >
                    <DonutChart
                        data={approvalChartItems}
                        ariaLabel="Distribución por estado de aprobación"
                        emptyMessage="No hay datos suficientes para generar esta gráfica en el periodo seleccionado."
                    />
                </DashboardSection>
                <DashboardSection
                    title="Registros de psicólogos en el tiempo"
                    description="Muestra la evolución de registros de psicólogos."
                    note={dashboardNote}
                >
                    <AreaChart
                        data={psychologistsByMonth}
                        ariaLabel="Registros de psicólogos en el tiempo"
                        emptyMessage="No hay datos suficientes para generar esta gráfica en el periodo seleccionado."
                    />
                </DashboardSection>
                <DashboardSection
                    title="Psicólogos por departamento"
                    description="Permite observar cobertura territorial de profesionales registrados."
                    note={dashboardNote}
                >
                    <TreemapChart
                        data={psychologistsByDepartment}
                        ariaLabel="Distribución territorial de psicólogos"
                        emptyMessage="No hay datos suficientes para generar esta gráfica en el periodo seleccionado."
                    />
                </DashboardSection>
                <DashboardSection
                    title="Verificación profesional"
                    description="Resume la proporción de psicólogos con verificación profesional registrada."
                    note={dashboardNote}
                >
                    <WaffleChart
                        data={verificationChartItems}
                        ariaLabel="Proporción de psicólogos verificados"
                        emptyMessage="No hay datos suficientes para generar esta gráfica en el periodo seleccionado."
                    />
                </DashboardSection>
                <DashboardSection
                    title="Solicitudes atendidas por psicólogos"
                    description="Relaciona la carga de solicitudes con la respuesta de los psicólogos."
                >
                    <DashboardEmptyState message="No hay datos agregados suficientes para generar esta gráfica." />
                </DashboardSection>
                <DashboardSection
                    title="Cobertura territorial vs demanda"
                    description="Permite identificar diferencias entre disponibilidad profesional y demanda de revisión."
                    note={dashboardNote}
                >
                    <HeatmapChart
                        rows={coverageRows}
                        columns={coverageColumns}
                        cells={coverageCells}
                        ariaLabel="Cobertura territorial según disponibilidad"
                        emptyMessage="No hay datos suficientes para generar esta gráfica en el periodo seleccionado."
                    />
                </DashboardSection>
            </div>



            <section className="admin-controls" aria-label="Controles de psicólogos">
                <div className="admin-search">
                    <span className="admin-search-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M11 4a7 7 0 1 1-4.95 11.95l-3.5 3.5 1.4 1.4 3.5-3.5A7 7 0 0 1 11 4Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" /></svg>
                    </span>
                    <input
                        type="search"
                        placeholder="Buscar por ID, usuario, correo o tarjeta..."
                        aria-label="Buscar psicólogos"
                        value={searchTerm}
                        onChange={(event) => {
                            setSearchTerm(event.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <div className="admin-filters">
                    <label>
                        <span>Estado</span>
                        <CustomSelect
                            ariaLabel="Estado de revisión"
                            value={reviewFilter}
                            options={reviewOptions}
                            onChange={(value) => {
                                setReviewFilter(value as ReviewFilter);
                                setPage(1);
                            }}
                        />
                    </label>
                </div>
            </section>

            <section className="admin-table" aria-label="Listado de psicólogos">
                <div className="admin-table-head psicologos-grid">
                    <span>Usuario</span>
                    <span>Correo</span>
                    <span>Tarjeta profesional</span>
                    <span>Estado</span>
                    <span>Motivo</span>
                    <span>Creado</span>
                    <span>Acciones</span>
                </div>

                {loading ? <div className="admin-loading">Cargando psicólogos...</div> : null}

                {!loading && paginatedRows.length === 0 ? (
                    <output className="admin-empty" aria-live="polite">
                        <span className="admin-empty-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" /></svg>
                        </span>
                        <strong>Sin psicólogos por revisar</strong>
                        <span>No hay psicólogos pendientes o rechazados con los filtros actuales.</span>
                    </output>
                ) : null}

                {!loading && paginatedRows.length > 0 ? (
                    <div className="admin-table-body">
                        {paginatedRows.map((item) => (
                            <div key={item.id} className="admin-row psicologos-grid">
                                <div>
                                    <div className="psicologos-name">{getDisplayName(item)}</div>
                                    <div className="admin-muted">{item.username}</div>
                                </div>
                                <div>{item.email}</div>
                                <div>{formatProfessionalCard(item.professional_card_number)}</div>
                                <div>
                                    <span className={`admin-status-badge ${item.reviewState}`}>
                                        {item.reviewState === 'pending' ? 'Pendiente' : 'Rechazado'}
                                    </span>
                                </div>
                                <div className="psicologos-reason">{item.reviewReason ?? '--'}</div>
                                <div>{formatDate(item.created_at)}</div>
                                <div className="psicologos-actions">
                                    <button
                                        type="button"
                                        className="admin-btn ghost psicologos-action-btn"
                                        onClick={() => {
                                            handleApprove(item).catch(() => undefined);
                                        }}
                                        disabled={submittingApprove}
                                    >
                                        Aprobar
                                    </button>
                                    <button
                                        type="button"
                                        className="admin-btn primary psicologos-action-btn"
                                        onClick={() => openRejectModal(item)}
                                    >
                                        Rechazar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}
            </section>

            <footer className="admin-pagination" aria-label="Páginación de psicólogos">
                <div>
                    Mostrando {displayFrom}-{displayTo} de {total}
                </div>
                <div className="admin-pagination-controls">
                    <button
                        type="button"
                        className="admin-page-nav-btn"
                        aria-label="Página anterior"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage <= 1}
                    >
                        <svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7" /></svg>
                    </button>
                    <span className="admin-page-current">Página {currentPage}</span>
                    <button
                        type="button"
                        className="admin-page-nav-btn"
                        aria-label="Página siguiente"
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage >= totalPages}
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
                            onChange={(value) => {
                                setPageSize(Number(value));
                                setPage(1);
                            }}
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
                    <h2>Configurar reporte de psicólogos</h2>
                    <p>Selecciona el alcance del reporte sin alterar el listado visible en pantalla.</p>

                    <div className="admin-report-grid">
                        <label>
                            <span>Estado de verificación</span>
                            <CustomSelect
                                ariaLabel="Estado de verificación del reporte"
                                value={reportForm.verification}
                                options={psychologistsVerificationOptions}
                                onChange={(value) =>
                                    setReportForm((prev) => ({ ...prev, verification: value as PsychologistsReportModalState['verification'] }))
                                }
                            />
                        </label>

                        <label>
                            <span>Estado de cuenta</span>
                            <CustomSelect
                                ariaLabel="Estado de cuenta del reporte"
                                value={reportForm.accountStatus}
                                options={psychologistsAccountStatusOptions}
                                onChange={(value) =>
                                    setReportForm((prev) => ({ ...prev, accountStatus: value as PsychologistsReportModalState['accountStatus'] }))
                                }
                            />
                        </label>

                        <label>
                            <span>Cantidad</span>
                            <CustomSelect
                                ariaLabel="Cantidad de psicólogos para el reporte"
                                value={reportForm.limit}
                                options={psychologistsReportLimitOptions}
                                onChange={(value) =>
                                    setReportForm((prev) => ({ ...prev, limit: value as PsychologistsReportModalState['limit'] }))
                                }
                            />
                        </label>
                    </div>

                    <div className="admin-report-checkbox">
                        <input id="psych-report-card" type="checkbox" checked readOnly />
                        <label htmlFor="psych-report-card">
                            <strong>Incluir tarjeta profesional</strong>
                            <span>La tarjeta profesional se mantiene como dato obligatorio del reporte.</span>
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
                                handleDownloadReport().catch(() => undefined);
                            }}
                            disabled={reportWorking}
                        >
                            {reportWorking ? 'Generando reporte...' : 'Generar PDF'}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isRejectOpen} onClose={closeRejectModal}>
                <div className="admin-modal">
                    <h2>{'Rechazar psic\u00f3logo'}</h2>
                    <p>
                        {'Indica la raz\u00f3n del rechazo para '}<strong>{selectedPsychologist?.username ?? ''}</strong>.
                    </p>
                    <p className="admin-muted">
                        Tarjeta profesional: {formatProfessionalCard(selectedPsychologist?.professional_card_number)}
                    </p>
                    <label>
                        <span>{'Raz\u00f3n'}</span>
                        <textarea
                            value={rejectReason}
                            onChange={(event) => setRejectReason(event.target.value)}
                            placeholder="Escribe la razón del rechazo"
                        />
                    </label>
                    <div className="admin-modal-actions">
                        <button type="button" className="admin-btn ghost" onClick={closeRejectModal}>Cancelar</button>
                        <button
                            type="button"
                            className="admin-btn primary"
                            onClick={() => {
                                handleRejectConfirm().catch(() => undefined);
                            }}
                            disabled={submittingReject || rejectReason.trim().length === 0}
                        >
                            {submittingReject ? 'Guardando...' : 'Confirmar rechazo'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
