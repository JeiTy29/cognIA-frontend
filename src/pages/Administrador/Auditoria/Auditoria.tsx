import { useEffect, useMemo, useState } from 'react';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { Modal } from '../../../components/Modal/Modal';
import { useAuditLogs } from '../../../hooks/useAuditLogs';
import type { AuditLogItem } from '../../../services/admin/audit';
import '../AdminShared.css';
import './Auditoria.css';

type DateOrder = 'desc' | 'asc';

const pageSizeOptions = [
    { value: '10', label: '10' },
    { value: '25', label: '25' },
    { value: '50', label: '50' }
];

const verifiedActionLabels: Record<string, string> = {
    USER_CREATED: 'Usuario creado'
};

const actionTokenLabels: Record<string, string> = {
    REGISTER: 'Registro',
    LOGIN: 'Inicio de sesion',
    LOGOUT: 'Cierre de sesion',
    USER: 'Usuario',
    USERS: 'Usuarios',
    CREATED: 'Creado',
    CREATE: 'Crear',
    UPDATED: 'Actualizado',
    UPDATE: 'Actualizar',
    DELETED: 'Eliminado',
    DELETE: 'Eliminar',
    PASSWORD: 'Contrasena',
    RESET: 'Restablecimiento',
    MFA: 'MFA',
    APPROVED: 'Aprobado',
    APPROVE: 'Aprobar',
    REJECTED: 'Rechazado',
    REJECT: 'Rechazar',
    PSYCHOLOGIST: 'Psicologo',
    QUESTIONNAIRE: 'Cuestionario',
    EVALUATION: 'Evaluacion',
    SESSION: 'Sesion',
    PROFILE: 'Perfil',
    ACCOUNT: 'Cuenta',
    EMAIL: 'Correo'
};

function formatDateTime(value: string | null) {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return `${date.toLocaleDateString('es-CO')} ${date.toLocaleTimeString('es-CO')}`;
}

function humanizeAction(action: string) {
    const normalized = action.trim();
    if (!normalized) return 'Sin accion';
    if (verifiedActionLabels[normalized]) return verifiedActionLabels[normalized];

    const tokens = normalized
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .split(/[_\s-]+/)
        .filter((token) => token.length > 0);

    if (tokens.length === 0) return normalized;

    return tokens
        .map((token) => {
            const upperToken = token.toUpperCase();
            if (actionTokenLabels[upperToken]) {
                return actionTokenLabels[upperToken];
            }
            const lowerToken = token.toLowerCase();
            return lowerToken.charAt(0).toUpperCase() + lowerToken.slice(1);
        })
        .join(' ');
}

export default function Auditoria() {
    const { items, loading, error } = useAuditLogs();
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('Todos');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [dateOrder, setDateOrder] = useState<DateOrder>('desc');
    const [selectedItem, setSelectedItem] = useState<AuditLogItem | null>(null);

    const actionOptions = useMemo(() => {
        const uniqueActions = Array.from(new Set(items.map((item) => item.action))).sort();
        return [
            { value: 'Todos', label: 'Todos' },
            ...uniqueActions.map((action) => ({
                value: action,
                label: humanizeAction(action)
            }))
        ];
    }, [items]);

    const filteredRows = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        const matchingRows = items.filter((item) => {
            const actionLabel = humanizeAction(item.action).toLowerCase();
            const matchesSearch =
                normalizedSearch.length === 0 ||
                item.action.toLowerCase().includes(normalizedSearch) ||
                actionLabel.includes(normalizedSearch) ||
                item.actor.toLowerCase().includes(normalizedSearch) ||
                item.target.toLowerCase().includes(normalizedSearch) ||
                item.summary.toLowerCase().includes(normalizedSearch) ||
                item.id.toLowerCase().includes(normalizedSearch);

            const matchesAction = actionFilter === 'Todos' || item.action === actionFilter;
            return matchesSearch && matchesAction;
        });

        return [...matchingRows].sort((first, second) => {
            const firstTime = first.timestamp ? new Date(first.timestamp).getTime() : 0;
            const secondTime = second.timestamp ? new Date(second.timestamp).getTime() : 0;

            if (dateOrder === 'asc') {
                return firstTime - secondTime;
            }
            return secondTime - firstTime;
        });
    }, [items, searchTerm, actionFilter, dateOrder]);

    useEffect(() => {
        setPage(1);
    }, [searchTerm, actionFilter, pageSize, dateOrder]);

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
                    <h1>Auditoria</h1>
                </div>
            </header>

            <div className="admin-divider" aria-hidden="true" />

            {error ? <div className="admin-alert error">{error}</div> : null}

            <section className="admin-controls" aria-label="Controles de auditoria">
                <div className="admin-search">
                    <span className="admin-search-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M11 4a7 7 0 1 1-4.95 11.95l-3.5 3.5 1.4 1.4 3.5-3.5A7 7 0 0 1 11 4Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" /></svg>
                    </span>
                    <input
                        type="search"
                        placeholder="Buscar por accion, actor, objetivo o ID..."
                        aria-label="Buscar auditoria"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                    />
                </div>
                <div className="admin-filters">
                    <label>
                        <span>Accion</span>
                        <CustomSelect
                            ariaLabel="Filtrar por accion"
                            value={actionFilter}
                            options={actionOptions}
                            onChange={(value) => setActionFilter(value)}
                            className="auditoria-filter-select"
                        />
                    </label>
                </div>
            </section>

            <section className="admin-table" aria-label="Listado de auditoria">
                <div className="admin-table-head auditoria-grid">
                    <button
                        type="button"
                        className="auditoria-sort-btn"
                        onClick={() => setDateOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                    >
                        Fecha
                        <span aria-hidden="true">{dateOrder === 'desc' ? '↓' : '↑'}</span>
                    </button>
                    <span>Accion</span>
                    <span>Actor</span>
                    <span>Objetivo</span>
                    <span>Resumen</span>
                    <span>Acciones</span>
                </div>

                {loading ? <div className="admin-loading">Cargando registros de auditoria...</div> : null}

                {!loading && paginatedRows.length === 0 ? (
                    <div className="admin-empty" role="status">
                        <div className="admin-empty-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M5 3h10a2 2 0 0 1 2 2v2h2v14H5Zm2 4h10V5H7Zm0 4h10v2H7Zm0 4h7v2H7Z" /></svg>
                        </div>
                        <h3>Sin registros</h3>
                        <p>No hay eventos con los filtros actuales.</p>
                    </div>
                ) : null}

                {!loading && paginatedRows.length > 0 ? (
                    <div className="admin-table-body">
                        {paginatedRows.map((item) => (
                            <div key={item.id} className="admin-row auditoria-grid">
                                <div>{formatDateTime(item.timestamp)}</div>
                                <div className="auditoria-action" title={item.action}>{humanizeAction(item.action)}</div>
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

            <footer className="admin-pagination" aria-label="Paginacion de auditoria">
                <div>
                    Mostrando {displayFrom}-{displayTo} de {total}
                </div>
                <div className="admin-pagination-controls">
                    <button
                        type="button"
                        className="admin-page-nav-btn"
                        aria-label="Pagina anterior"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage <= 1}
                    >
                        <svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7" /></svg>
                    </button>
                    <span className="admin-page-current">Pagina {currentPage}</span>
                    <button
                        type="button"
                        className="admin-page-nav-btn"
                        aria-label="Pagina siguiente"
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage >= totalPages}
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
                            onChange={(value) => setPageSize(Number(value))}
                        />
                    </label>
                </div>
            </footer>

            <Modal isOpen={selectedItem !== null} onClose={() => setSelectedItem(null)}>
                <div className="admin-modal">
                    <h2>Detalle de auditoria</h2>
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
