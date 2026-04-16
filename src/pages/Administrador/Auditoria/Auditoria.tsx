import { useEffect, useMemo, useState } from 'react';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { Modal } from '../../../components/Modal/Modal';
import { useAuditLogs } from '../../../hooks/useAuditLogs';
import type { AuditLogItem } from '../../../services/admin/audit';
import '../AdminShared.css';
import './Auditoria.css';

const pageSizeOptions = [
    { value: '10', label: '10' },
    { value: '25', label: '25' },
    { value: '50', label: '50' }
];

function formatDateTime(value: string | null) {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return `${date.toLocaleDateString('es-CO')} ${date.toLocaleTimeString('es-CO')}`;
}

export default function Auditoria() {
    const { items, loading, error, lastUpdated, reload } = useAuditLogs();
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('Todos');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [selectedItem, setSelectedItem] = useState<AuditLogItem | null>(null);

    const actionOptions = useMemo(() => {
        const uniqueActions = Array.from(new Set(items.map((item) => item.action))).sort();
        return [{ value: 'Todos', label: 'Todos' }, ...uniqueActions.map((action) => ({ value: action, label: action }))];
    }, [items]);

    const filteredRows = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        return items.filter((item) => {
            const matchesSearch =
                normalizedSearch.length === 0 ||
                item.action.toLowerCase().includes(normalizedSearch) ||
                item.actor.toLowerCase().includes(normalizedSearch) ||
                item.target.toLowerCase().includes(normalizedSearch) ||
                item.summary.toLowerCase().includes(normalizedSearch) ||
                item.id.toLowerCase().includes(normalizedSearch);

            const matchesAction = actionFilter === 'Todos' || item.action === actionFilter;
            return matchesSearch && matchesAction;
        });
    }, [items, searchTerm, actionFilter]);

    useEffect(() => {
        setPage(1);
    }, [searchTerm, actionFilter, pageSize]);

    const total = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const displayFrom = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const displayTo = total === 0 ? 0 : Math.min(currentPage * pageSize, total);

    return (
        <div className="admin-page auditoria-page">
            <header className="admin-header">
                <div className="admin-title">
                    <h1>Auditoría</h1>
                    <p>Consulta eventos operativos del sistema sin mezclar esta vista con métricas.</p>
                    {lastUpdated ? <div className="admin-muted">Última actualización: {lastUpdated.toLocaleTimeString()}</div> : null}
                </div>
                <div className="admin-actions">
                    <button type="button" className="admin-btn ghost" onClick={() => void reload()}>
                        Actualizar
                    </button>
                </div>
            </header>

            <div className="admin-divider" aria-hidden="true" />

            {error ? <div className="admin-alert error">{error}</div> : null}

            <section className="admin-controls" aria-label="Controles de auditoría">
                <div className="admin-search">
                    <span className="admin-search-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M11 4a7 7 0 1 1-4.95 11.95l-3.5 3.5 1.4 1.4 3.5-3.5A7 7 0 0 1 11 4Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" /></svg>
                    </span>
                    <input
                        type="search"
                        placeholder="Buscar por acción, actor, objetivo o ID..."
                        aria-label="Buscar auditoría"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                    />
                </div>
                <div className="admin-filters">
                    <label>
                        <span>Acción</span>
                        <CustomSelect
                            ariaLabel="Filtrar por acción"
                            value={actionFilter}
                            options={actionOptions}
                            onChange={(value) => setActionFilter(value)}
                        />
                    </label>
                </div>
            </section>

            <section className="admin-table" aria-label="Listado de auditoría">
                <div className="admin-table-head auditoria-grid">
                    <span>Fecha</span>
                    <span>Acción</span>
                    <span>Actor</span>
                    <span>Objetivo</span>
                    <span>Resumen</span>
                    <span>Acciones</span>
                </div>

                {loading ? <div className="admin-loading">Cargando registros de auditoría...</div> : null}

                {!loading && paginatedRows.length === 0 ? (
                    <div className="admin-empty" role="status">
                        <div className="admin-empty-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M5 3h10a2 2 0 0 1 2 2v2h2v14H5Zm2 4h10V5H7Zm0 4h10v2H7Zm0 4h7v2H7Z" /></svg>
                        </div>
                        <h3>Sin registros</h3>
                        <p>No hay eventos de auditoría con los filtros actuales.</p>
                    </div>
                ) : null}

                {!loading && paginatedRows.length > 0 ? (
                    <div className="admin-table-body">
                        {paginatedRows.map((item) => (
                            <div key={item.id} className="admin-row auditoria-grid">
                                <div>{formatDateTime(item.timestamp)}</div>
                                <div className="auditoria-action">{item.action}</div>
                                <div>{item.actor}</div>
                                <div>{item.target}</div>
                                <div className="auditoria-summary">{item.summary}</div>
                                <div>
                                    <button
                                        type="button"
                                        className="admin-btn ghost auditoria-detail-btn"
                                        onClick={() => setSelectedItem(item)}
                                    >
                                        Detalle
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}
            </section>

            <footer className="admin-pagination" aria-label="Paginación de auditoría">
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

            <Modal isOpen={selectedItem !== null} onClose={() => setSelectedItem(null)}>
                <div className="admin-modal">
                    <h2>Detalle de auditoría</h2>
                    <div className="admin-detail-list">
                        {selectedItem
                            ? Object.entries(selectedItem.raw).map(([key, value]) => (
                                <div key={key} className="admin-detail-row">
                                    <strong>{key}</strong>
                                    <span>{typeof value === 'string' ? value : JSON.stringify(value)}</span>
                                </div>
                            ))
                            : null}
                    </div>
                    <div className="admin-modal-actions">
                        <button type="button" className="admin-btn ghost" onClick={() => setSelectedItem(null)}>
                            Cerrar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
