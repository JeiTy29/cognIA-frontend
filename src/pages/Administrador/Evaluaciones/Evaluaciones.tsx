import { useMemo, useState } from 'react';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { Modal } from '../../../components/Modal/Modal';
import { useAdminEvaluations } from '../../../hooks/useAdminEvaluations';
import {
    ADMIN_EVALUATION_STATUSES,
    type AdminEvaluationItem
} from '../../../services/admin/evaluations';
import '../AdminShared.css';
import './Evaluaciones.css';

type StatusFormState = {
    status: string;
};

const statusFilterOptions = [
    { value: '', label: 'Todos' },
    ...ADMIN_EVALUATION_STATUSES.map((status) => ({
        value: status,
        label: status
    }))
];

const orderOptions = [
    { value: 'created_at:desc', label: 'Creadas recientes' },
    { value: 'created_at:asc', label: 'Creadas antiguas' },
    { value: 'evaluation_date:desc', label: 'Evaluacion reciente' },
    { value: 'evaluation_date:asc', label: 'Evaluacion antigua' },
    { value: 'age_at_evaluation:asc', label: 'Edad menor a mayor' },
    { value: 'age_at_evaluation:desc', label: 'Edad mayor a menor' }
];

const pageSizeOptions = [
    { value: '10', label: '10' },
    { value: '20', label: '20' },
    { value: '50', label: '50' }
];

function formatDate(value: string | null) {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('es-CO');
}

function getOrderValue(sort: string, order: string) {
    return `${sort}:${order}`;
}

function getStatusBadgeClass(status: string) {
    const normalized = status.trim().toLowerCase();
    if (normalized === 'completed') return 'ok';
    if (normalized === 'submitted') return 'pending';
    return 'neutral';
}

function truncateId(value: string | null) {
    if (!value) return '--';
    if (value.length <= 14) return value;
    return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

export default function Evaluaciones() {
    const {
        items,
        page,
        pageSize,
        total,
        pages,
        statusFilter,
        ageMinFilter,
        ageMaxFilter,
        dateFromFilter,
        dateToFilter,
        sort,
        order,
        loading,
        error,
        notice,
        submittingStatus,
        setPage,
        setStatusFilter,
        setAgeMinFilter,
        setAgeMaxFilter,
        setDateFromFilter,
        setDateToFilter,
        setOrdering,
        changePageSize,
        changeEvaluationStatus,
        clearMessages
    } = useAdminEvaluations();

    const [selectedItem, setSelectedItem] = useState<AdminEvaluationItem | null>(null);
    const [statusForm, setStatusForm] = useState<StatusFormState>({ status: 'draft' });

    const currentPage = Math.min(page, Math.max(1, pages));
    const displayFrom = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const displayTo = total === 0 ? 0 : Math.min(currentPage * pageSize, total);
    const orderValue = useMemo(() => getOrderValue(sort, order), [sort, order]);

    const openStatusModal = (item: AdminEvaluationItem) => {
        clearMessages();
        setSelectedItem(item);
        setStatusForm({ status: item.status || ADMIN_EVALUATION_STATUSES[0] });
    };

    const closeStatusModal = () => {
        setSelectedItem(null);
        setStatusForm({ status: ADMIN_EVALUATION_STATUSES[0] });
    };

    const handleStatusSubmit = async () => {
        if (!selectedItem) return;
        const success = await changeEvaluationStatus(selectedItem.id, statusForm.status);
        if (success) {
            closeStatusModal();
        }
    };

    return (
        <div className="admin-page evaluaciones-page">
            <header className="admin-header">
                <div className="admin-title">
                    <h1>Evaluaciones</h1>
                </div>
            </header>

            <div className="admin-divider" aria-hidden="true" />

            {notice ? <div className="admin-alert success">{notice}</div> : null}
            {error ? <div className="admin-alert error">{error}</div> : null}

            <section className="admin-controls" aria-label="Controles de evaluaciones">
                <div className="admin-filters">
                    <label>
                        <span>Estado</span>
                        <CustomSelect
                            ariaLabel="Filtrar por estado"
                            value={statusFilter}
                            options={statusFilterOptions}
                            onChange={setStatusFilter}
                        />
                    </label>

                    <label>
                        <span>Edad min.</span>
                        <input
                            className="evaluaciones-filter-input"
                            type="number"
                            min="0"
                            value={ageMinFilter}
                            onChange={(event) => setAgeMinFilter(event.target.value)}
                        />
                    </label>

                    <label>
                        <span>Edad max.</span>
                        <input
                            className="evaluaciones-filter-input"
                            type="number"
                            min="0"
                            value={ageMaxFilter}
                            onChange={(event) => setAgeMaxFilter(event.target.value)}
                        />
                    </label>

                    <label>
                        <span>Desde</span>
                        <input
                            className="evaluaciones-filter-input"
                            type="date"
                            value={dateFromFilter}
                            onChange={(event) => setDateFromFilter(event.target.value)}
                        />
                    </label>

                    <label>
                        <span>Hasta</span>
                        <input
                            className="evaluaciones-filter-input"
                            type="date"
                            value={dateToFilter}
                            onChange={(event) => setDateToFilter(event.target.value)}
                        />
                    </label>

                    <label>
                        <span>Orden</span>
                        <CustomSelect
                            ariaLabel="Ordenar evaluaciones"
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

            <section className="admin-table" aria-label="Listado de evaluaciones">
                <div className="admin-table-head evaluaciones-grid">
                    <span>ID</span>
                    <span>Estado</span>
                    <span>Edad</span>
                    <span>Fecha de evaluacion</span>
                    <span>Psicologo</span>
                    <span>Sujeto</span>
                    <span>Creado</span>
                    <span>Acciones</span>
                </div>

                {loading ? <div className="admin-loading">Cargando evaluaciones...</div> : null}

                {!loading && items.length === 0 ? (
                    <div className="admin-empty" role="status">
                        <div className="admin-empty-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M5 4h14v16H5V4Zm2 2v12h10V6H7Zm2 2h6v2H9V8Zm0 4h6v2H9v-2Z" /></svg>
                        </div>
                        <h3>Sin evaluaciones</h3>
                        <p>No hay registros para los filtros actuales.</p>
                    </div>
                ) : null}

                {!loading && items.length > 0 ? (
                    <div className="admin-table-body">
                        {items.map((item) => (
                            <div key={item.id} className="admin-row evaluaciones-grid">
                                <div className="evaluaciones-id" title={item.id}>{truncateId(item.id)}</div>
                                <div>
                                    <span className={`admin-status-badge ${getStatusBadgeClass(item.status)}`}>
                                        {item.status}
                                    </span>
                                </div>
                                <div>{item.age_at_evaluation ?? '--'}</div>
                                <div>{formatDate(item.evaluation_date)}</div>
                                <div className="evaluaciones-id" title={item.psychologist_id ?? undefined}>
                                    {truncateId(item.psychologist_id)}
                                </div>
                                <div className="evaluaciones-id" title={item.subject_id ?? undefined}>
                                    {truncateId(item.subject_id)}
                                </div>
                                <div>{formatDate(item.created_at)}</div>
                                <div>
                                    <button
                                        type="button"
                                        className="admin-btn ghost evaluaciones-action-btn"
                                        onClick={() => openStatusModal(item)}
                                    >
                                        Cambiar estado
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}
            </section>

            <footer className="admin-pagination" aria-label="Paginacion de evaluaciones">
                <div>
                    Mostrando {displayFrom}-{displayTo} de {total}
                </div>
                <div className="admin-pagination-controls">
                    <button
                        type="button"
                        className="admin-page-nav-btn"
                        aria-label="Pagina anterior"
                        onClick={() => setPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage <= 1}
                    >
                        <svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7" /></svg>
                    </button>
                    <span className="admin-page-current">Pagina {currentPage}</span>
                    <button
                        type="button"
                        className="admin-page-nav-btn"
                        aria-label="Pagina siguiente"
                        onClick={() => setPage(Math.min(pages, currentPage + 1))}
                        disabled={currentPage >= pages}
                    >
                        <svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" /></svg>
                    </button>
                </div>
                <div className="admin-page-size">
                    <label>
                        <span>Tamano</span>
                        <CustomSelect
                            ariaLabel="Tamano de pagina"
                            value={String(pageSize)}
                            options={pageSizeOptions}
                            onChange={(value) => changePageSize(Number(value))}
                        />
                    </label>
                </div>
            </footer>

            <Modal isOpen={selectedItem !== null} onClose={closeStatusModal}>
                <div className="admin-modal">
                    <h2>Cambiar estado</h2>
                    <p>
                        {selectedItem ? `Actualiza el estado de ${truncateId(selectedItem.id)}.` : ''}
                    </p>
                    <label>
                        <span>Nuevo estado</span>
                        <CustomSelect
                            ariaLabel="Seleccionar nuevo estado"
                            value={statusForm.status}
                            options={ADMIN_EVALUATION_STATUSES.map((status) => ({
                                value: status,
                                label: status
                            }))}
                            onChange={(value) => setStatusForm({ status: value })}
                        />
                    </label>
                    <div className="admin-modal-actions">
                        <button type="button" className="admin-btn ghost" onClick={closeStatusModal}>
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="admin-btn primary"
                            onClick={() => void handleStatusSubmit()}
                            disabled={submittingStatus}
                        >
                            {submittingStatus ? 'Guardando...' : 'Confirmar'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
