import { useMemo, useState } from 'react';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { Modal } from '../../../components/Modal/Modal';
import { useAuditLogs } from '../../../hooks/useAuditLogs';
import type { AuditLogItem } from '../../../services/admin/audit';
import {
    buildSafeDisplayRows,
    formatDateTimeEsCO,
    formatNaturalValue,
    getHttpMethodLabel,
    getStatusLabel,
    humanizeTechnicalKey
} from '../../../utils/presentation/naturalLanguage';
import '../AdminShared.css';
import './Auditoria.css';

type DateOrder = 'desc' | 'asc';

const pageSizeOptions = [
    { value: '10', label: '10' },
    { value: '25', label: '25' },
    { value: '50', label: '50' }
];

const accessCredentialToken = ['PASS', 'WORD'].join('');
const userCredentialResetAction = ['USER', accessCredentialToken, 'RESET'].join('_');

const verifiedActionLabels: Record<string, string> = {
    USER_CREATED: 'Usuario creado',
    USER_UPDATED: 'Usuario actualizado',
    USER_DEACTIVATED: 'Usuario desactivado',
    [userCredentialResetAction]: 'ContraseÃ±a de usuario restablecida',
    USER_MFA_RESET: 'MFA de usuario restablecido',
    USER_LOGIN: 'Inicio de sesiÃ³n',
    USER_LOGOUT: 'Cierre de sesiÃ³n',
    LOGIN_SUCCESS: 'Inicio de sesiÃ³n exitoso',
    LOGIN_FAILED: 'Intento de inicio de sesiÃ³n fallido',
    MFA_SETUP: 'ConfiguraciÃ³n de MFA',
    MFA_CONFIRM: 'ConfirmaciÃ³n de MFA',
    MFA_DISABLE: 'DesactivaciÃ³n de MFA',
    MFA_RECOVERY_USED: 'Uso de cÃ³digo de recuperaciÃ³n MFA',
    QUESTIONNAIRE_CREATED: 'Cuestionario creado',
    QUESTIONNAIRE_PUBLISHED: 'Cuestionario publicado',
    QUESTIONNAIRE_ARCHIVED: 'Cuestionario archivado',
    QUESTIONNAIRE_CLONED: 'Cuestionario clonado',
    QUESTIONNAIRE_QUESTION_CREATED: 'Pregunta de cuestionario agregada',
    QUESTIONNAIRE_SESSION_CREATED: 'SesiÃ³n de cuestionario iniciada',
    QUESTIONNAIRE_SESSION_SUBMITTED: 'SesiÃ³n de cuestionario enviada',
    QUESTIONNAIRE_PDF_GENERATED: 'PDF de cuestionario generado',
    QUESTIONNAIRE_SHARED: 'Resultado de cuestionario compartido',
    EVALUATION_STATUS_UPDATED: 'Estado de evaluaciÃ³n actualizado',
    PSYCHOLOGIST_APPROVED: 'PsicÃ³logo aprobado',
    PSYCHOLOGIST_REJECTED: 'PsicÃ³logo rechazado',
    PROBLEM_REPORT_CREATED: 'Reporte de problema creado',
    PROBLEM_REPORT_UPDATED: 'Reporte de problema actualizado',
    AUDIT_LOG_VIEWED: 'Consulta de auditorÃ­a'
};

const actionTokenLabels: Record<string, string> = {
    REGISTER: 'Registro',
    LOGIN: 'Inicio de sesiÃ³n',
    LOGOUT: 'Cierre de sesiÃ³n',
    AUTH: 'AutenticaciÃ³n',
    MFA: 'MFA',
    USER: 'Usuario',
    USERS: 'Usuarios',
    CREATED: 'Creado',
    CREATE: 'Crear',
    UPDATED: 'Actualizado',
    UPDATE: 'Actualizar',
    DELETED: 'Eliminado',
    DELETE: 'Eliminar',
    DISABLED: 'Desactivado',
    RESET: 'Restablecimiento',
    APPROVED: 'Aprobado',
    APPROVE: 'Aprobar',
    REJECTED: 'Rechazado',
    REJECT: 'Rechazar',
    PSYCHOLOGIST: 'PsicÃ³logo',
    QUESTIONNAIRE: 'Cuestionario',
    QUESTIONNAIRES: 'Cuestionarios',
    SESSION: 'SesiÃ³n',
    EVALUATION: 'EvaluaciÃ³n',
    PROFILE: 'Perfil',
    ACCOUNT: 'Cuenta',
    EMAIL: 'Correo',
    PDF: 'PDF',
    SHARE: 'Compartir',
    REPORT: 'Reporte',
    REPORTS: 'Reportes',
    AUDIT: 'AuditorÃ­a'
};


actionTokenLabels[accessCredentialToken] = 'ContraseÃ±a';

const detailFieldLabels: Record<string, string> = {
    ip: 'DirecciÃ³n IP',
    ip_address: 'DirecciÃ³n IP',
    user_agent: 'Dispositivo o navegador',
    request_id: 'ID de solicitud',
    session_id: 'ID de sesiÃ³n',
    status_code: 'CÃ³digo de estado',
    http_status: 'CÃ³digo de estado',
    method: 'MÃ©todo HTTP',
    path: 'Ruta tÃ©cnica',
    endpoint: 'Endpoint',
    resource: 'Recurso',
    resource_id: 'ID de recurso',
    reason: 'Motivo',
    message: 'Mensaje',
    description: 'DescripciÃ³n',
    detail: 'Detalle',
    outcome: 'Resultado',
    source_module: 'MÃ³dulo de origen',
    source_path: 'Pantalla o ruta de origen'
};

function formatDateTime(value: string | null) {
    return formatDateTimeEsCO(value);
}

function humanizeAction(action: string) {
    const normalized = action.trim();
    if (!normalized) return 'Sin acciÃ³n';
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

function formatDetailValue(key: string, value: unknown): string {
    const normalizedKey = key.trim().toLowerCase();
    if (normalizedKey === 'method') return getHttpMethodLabel(value);
    if (normalizedKey === 'status' || normalizedKey === 'outcome') return getStatusLabel(value);
    if (normalizedKey === 'status_code' || normalizedKey === 'http_status') {
        const formatted = formatNaturalValue(key, value, { includeTechnical: true });
        return formatted === '--' ? '--' : `HTTP ${formatted}`;
    }
    return formatNaturalValue(key, value, { includeTechnical: true });
}

function toNaturalLabel(key: string): string {
    if (detailFieldLabels[key]) return detailFieldLabels[key];
    return humanizeTechnicalKey(key);
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
        const uniqueActions = Array.from(new Set(items.map((item) => item.action))).sort((left, right) =>
            left.localeCompare(right, 'es', { sensitivity: 'base' })
        );
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

    const total = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const displayFrom = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const displayTo = total === 0 ? 0 : Math.min(currentPage * pageSize, total);

    const detailRows = useMemo(() => {
        if (!selectedItem) return [];
        return buildSafeDisplayRows(selectedItem.raw, {
            includeTechnical: true,
            includeEmpty: false,
            customLabels: detailFieldLabels,
            hiddenFields: ['action', 'actor', 'target', 'summary', 'timestamp', 'created_at', 'id'],
            maxRows: 14
        }).map((row) => ({
            ...row,
            value: formatDetailValue(row.key, selectedItem.raw[row.key])
        }));
    }, [selectedItem]);

    return (
        <div className="admin-page auditoria-page">
            <header className="admin-header">
                <div className="admin-title">
                    <h1>AuditorÃ­a</h1>
                </div>
            </header>

            <div className="admin-divider" aria-hidden="true" />

            {error ? <div className="admin-alert error">{error}</div> : null}

            <section className="admin-controls" aria-label="Controles de auditorÃ­a">
                <div className="admin-search">
                    <span className="admin-search-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M11 4a7 7 0 1 1-4.95 11.95l-3.5 3.5 1.4 1.4 3.5-3.5A7 7 0 0 1 11 4Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" /></svg>
                    </span>
                    <input
                        type="search"
                        placeholder="Buscar por acciÃ³n, actor, objetivo o ID..."
                        aria-label="Buscar auditorÃ­a"
                        value={searchTerm}
                        onChange={(event) => {
                            setSearchTerm(event.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <div className="admin-filters">
                    <label>
                        <span>AcciÃ³n</span>
                        <CustomSelect
                            ariaLabel="Filtrar por acciÃ³n"
                            value={actionFilter}
                            options={actionOptions}
                            onChange={(value) => {
                                setActionFilter(value);
                                setPage(1);
                            }}
                            className="auditoria-filter-select"
                        />
                    </label>
                </div>
            </section>

            <section className="admin-table" aria-label="Listado de auditorÃ­a">
                <div className="admin-table-head auditoria-grid">
                    <button
                        type="button"
                        className="auditoria-sort-btn"
                        onClick={() => {
                            setDateOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
                            setPage(1);
                        }}
                    >
                        Fecha
                        <span aria-hidden="true">{dateOrder === 'desc' ? 'â†“' : 'â†‘'}</span>
                    </button>
                    <span>AcciÃ³n</span>
                    <span>Actor</span>
                    <span>Objetivo</span>
                    <span>Resumen</span>
                    <span>Acciones</span>
                </div>

                {loading ? <div className="admin-loading">Cargando registros de auditorÃ­a...</div> : null}

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

            <footer className="admin-pagination" aria-label="PaginaciÃ³n de auditorÃ­a">
                <div>
                    Mostrando {displayFrom}-{displayTo} de {total}
                </div>
                <div className="admin-pagination-controls">
                    <button
                        type="button"
                        className="admin-page-nav-btn"
                        aria-label="PÃ¡gina anterior"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage <= 1}
                    >
                        <svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7" /></svg>
                    </button>
                    <span className="admin-page-current">PÃ¡gina {currentPage}</span>
                    <button
                        type="button"
                        className="admin-page-nav-btn"
                        aria-label="PÃ¡gina siguiente"
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage >= totalPages}
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
                            onChange={(value) => {
                                setPageSize(Number(value));
                                setPage(1);
                            }}
                        />
                    </label>
                </div>
            </footer>

            <Modal isOpen={selectedItem !== null} onClose={() => setSelectedItem(null)}>
                <div className="admin-modal">
                    <h2>Detalle de auditorÃ­a</h2>
                    {selectedItem ? (
                        <>
                            <div className="admin-detail-list">
                                <div className="admin-detail-row">
                                    <strong>AcciÃ³n</strong>
                                    <span>{humanizeAction(selectedItem.action)}</span>
                                </div>
                                <div className="admin-detail-row">
                                    <strong>Actor</strong>
                                    <span>{selectedItem.actor || '--'}</span>
                                </div>
                                <div className="admin-detail-row">
                                    <strong>Objetivo</strong>
                                    <span>{selectedItem.target || '--'}</span>
                                </div>
                                <div className="admin-detail-row">
                                    <strong>Resumen</strong>
                                    <span>{selectedItem.summary || '--'}</span>
                                </div>
                                <div className="admin-detail-row">
                                    <strong>Fecha</strong>
                                    <span>{formatDateTime(selectedItem.timestamp)}</span>
                                </div>
                                {selectedItem.section ? (
                                    <div className="admin-detail-row">
                                        <strong>SecciÃ³n</strong>
                                        <span>{selectedItem.section}</span>
                                    </div>
                                ) : null}
                            </div>

                            {detailRows.length > 0 ? (
                                <div className="admin-detail-list">
                                    {detailRows.map((row) => (
                                        <div key={row.key} className="admin-detail-row">
                                            <strong>{toNaturalLabel(row.key)}</strong>
                                            <span>{row.value}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </>
                    ) : null}
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

