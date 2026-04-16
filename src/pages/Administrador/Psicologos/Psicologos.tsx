import { useEffect, useMemo, useState } from 'react';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { Modal } from '../../../components/Modal/Modal';
import { usePsychologists } from '../../../hooks/usePsychologists';
import type { PsychologistAdminItem } from '../../../hooks/usePsychologists';
import '../AdminShared.css';
import './Psicologos.css';

type ReviewFilter = 'Todos' | 'Pendientes' | 'Rechazados';

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

function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleDateString('es-CO');
}

function getDisplayName(item: PsychologistAdminItem) {
    return item.full_name && item.full_name.trim().length > 0 ? item.full_name : 'Sin nombre';
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
        loadPsychologists,
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

    const filteredRows = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        return items.filter((item) => {
            const matchesSearch =
                normalizedSearch.length === 0 ||
                item.username.toLowerCase().includes(normalizedSearch) ||
                item.email.toLowerCase().includes(normalizedSearch) ||
                item.id.toLowerCase().includes(normalizedSearch) ||
                getDisplayName(item).toLowerCase().includes(normalizedSearch);

            const matchesReview =
                reviewFilter === 'Todos' ||
                (reviewFilter === 'Pendientes' && item.reviewState === 'pending') ||
                (reviewFilter === 'Rechazados' && item.reviewState === 'rejected');

            return matchesSearch && matchesReview;
        });
    }, [items, searchTerm, reviewFilter]);

    useEffect(() => {
        setPage(1);
    }, [searchTerm, reviewFilter, pageSize]);

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

    return (
        <div className="admin-page psicologos-page">
            <header className="admin-header">
                <div className="admin-title">
                    <h1>Psicólogos</h1>
                    <p>Revisa solicitudes pendientes y rechazos sin duplicar psicólogos ya aprobados.</p>
                </div>
                <div className="admin-actions">
                    <button type="button" className="admin-btn ghost" onClick={() => void loadPsychologists()}>
                        Actualizar
                    </button>
                </div>
            </header>

            <div className="admin-divider" aria-hidden="true" />

            {notice ? <div className="admin-alert success">{notice}</div> : null}
            {error ? <div className="admin-alert error">{error}</div> : null}
            {statusUnavailable ? (
                <div className="admin-alert info">
                    El backend no expone de forma reconocible el estado de revisión para los psicólogos listados. Solo se muestran
                    registros con estado pendiente o rechazado identificable.
                </div>
            ) : null}

            <section className="admin-controls" aria-label="Controles de psicólogos">
                <div className="admin-search">
                    <span className="admin-search-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M11 4a7 7 0 1 1-4.95 11.95l-3.5 3.5 1.4 1.4 3.5-3.5A7 7 0 0 1 11 4Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" /></svg>
                    </span>
                    <input
                        type="search"
                        placeholder="Buscar por ID, usuario o correo..."
                        aria-label="Buscar psicólogos"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                    />
                </div>
                <div className="admin-filters">
                    <label>
                        <span>Estado</span>
                        <CustomSelect
                            ariaLabel="Estado de revisión"
                            value={reviewFilter}
                            options={reviewOptions}
                            onChange={(value) => setReviewFilter(value as ReviewFilter)}
                        />
                    </label>
                </div>
            </section>

            <section className="admin-table" aria-label="Listado de psicólogos">
                <div className="admin-table-head psicologos-grid">
                    <span>Usuario</span>
                    <span>Correo</span>
                    <span>Estado</span>
                    <span>Motivo</span>
                    <span>Creado</span>
                    <span>Acciones</span>
                </div>

                {loading ? <div className="admin-loading">Cargando psicólogos...</div> : null}

                {!loading && paginatedRows.length === 0 ? (
                    <div className="admin-empty" role="status">
                        <div className="admin-empty-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" /></svg>
                        </div>
                        <h3>Sin psicólogos por revisar</h3>
                        <p>No hay psicólogos pendientes o rechazados con los filtros actuales.</p>
                    </div>
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
                                        onClick={() => void handleApprove(item)}
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

            <footer className="admin-pagination" aria-label="Paginación de psicólogos">
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
                            onChange={(value) => setPageSize(Number(value))}
                        />
                    </label>
                </div>
            </footer>

            <Modal isOpen={isRejectOpen} onClose={closeRejectModal}>
                <div className="admin-modal">
                    <h2>Rechazar psicólogo</h2>
                    <p>
                        Indica la razón del rechazo para <strong>{selectedPsychologist?.username ?? ''}</strong>.
                    </p>
                    <label>
                        <span>Razón</span>
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
                            onClick={() => void handleRejectConfirm()}
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
