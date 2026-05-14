import { useMemo, useState } from 'react';
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

function formatDate(value: string | null) {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleDateString('es-CO');
}

function getDisplayName(item: PsychologistAdminItem) {
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
                </div>
            </header>

            <div className="admin-divider" aria-hidden="true" />

            {notice ? <div className="admin-alert success">{notice}</div> : null}
            {error ? <div className="admin-alert error">{error}</div> : null}
            {statusUnavailable ? (
                <div className="admin-alert warning">
                    Se encontraron psicólogos, pero ninguno tenía un estado de revisión visible. Se mostraron como pendientes o rechazados
                    cuando el backend entregó señales compatibles.
                </div>
            ) : null}

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
                            onChange={(value) => {
                                setPageSize(Number(value));
                                setPage(1);
                            }}
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
                    <p className="admin-muted">
                        Tarjeta profesional: {formatProfessionalCard(selectedPsychologist?.professional_card_number)}
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
