import { type FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { Modal } from '../../../components/Modal/Modal';
import { useAdminQuestionnaires } from '../../../hooks/useAdminQuestionnaires';
import type { AdminQuestionnaireItem } from '../../../services/admin/questionnaires';
import '../AdminShared.css';
import './Cuestionarios.css';

type ToggleFilter = 'all' | 'true' | 'false';

type CloneFormState = {
    version: string;
    name: string;
    description: string;
};

type CreateFormState = {
    name: string;
    version: string;
    description: string;
};

type PendingAction =
    | { type: 'publish'; item: AdminQuestionnaireItem }
    | { type: 'archive'; item: AdminQuestionnaireItem }
    | null;

const activeOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'true', label: 'Activos' },
    { value: 'false', label: 'Inactivos' }
];

const archivedOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'true', label: 'Archivados' },
    { value: 'false', label: 'No archivados' }
];

const orderOptions = [
    { value: 'updated_at:desc', label: 'Actualizados recientes' },
    { value: 'updated_at:asc', label: 'Actualizados antiguos' },
    { value: 'created_at:desc', label: 'Creados recientes' },
    { value: 'created_at:asc', label: 'Creados antiguos' },
    { value: 'name:asc', label: 'Nombre A-Z' },
    { value: 'name:desc', label: 'Nombre Z-A' }
];

const pageSizeOptions = [
    { value: '10', label: '10' },
    { value: '20', label: '20' },
    { value: '50', label: '50' }
];

const initialCloneForm = (): CloneFormState => ({
    version: '',
    name: '',
    description: ''
});

const initialCreateForm = (): CreateFormState => ({
    name: '',
    version: '',
    description: ''
});

function formatDateTime(value: string | null) {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return `${date.toLocaleDateString('es-CO')} ${date.toLocaleTimeString('es-CO')}`;
}

function SearchIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M11 4a7 7 0 1 1-4.95 11.95l-3.5 3.5 1.4 1.4 3.5-3.5A7 7 0 0 1 11 4Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" />
        </svg>
    );
}

function getOrderValue(sort: string, order: string) {
    return `${sort}:${order}`;
}

export default function Cuestionarios() {
    const navigate = useNavigate();
    const {
        items,
        page,
        pageSize,
        total,
        pages,
        nameFilter,
        versionFilter,
        activeFilter,
        archivedFilter,
        sort,
        order,
        loading,
        error,
        notice,
        submittingPublish,
        submittingArchive,
        submittingClone,
        submittingCreate,
        setPage,
        setNameFilter,
        setVersionFilter,
        setActiveFilter,
        setArchivedFilter,
        setOrdering,
        changePageSize,
        publishQuestionnaire,
        archiveQuestionnaire,
        cloneQuestionnaire,
        createQuestionnaireTemplate,
        clearMessages
    } = useAdminQuestionnaires();

    const [pendingAction, setPendingAction] = useState<PendingAction>(null);
    const [cloneTarget, setCloneTarget] = useState<AdminQuestionnaireItem | null>(null);
    const [cloneForm, setCloneForm] = useState<CloneFormState>(initialCloneForm);
    const [cloneError, setCloneError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createForm, setCreateForm] = useState<CreateFormState>(initialCreateForm);
    const [createError, setCreateError] = useState<string | null>(null);

    const currentPage = Math.min(page, Math.max(1, pages));
    const displayFrom = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const displayTo = total === 0 ? 0 : Math.min(currentPage * pageSize, total);

    const orderValue = useMemo(() => getOrderValue(sort, order), [sort, order]);

    const openConfirmAction = (type: 'publish' | 'archive', item: AdminQuestionnaireItem) => {
        clearMessages();
        setPendingAction({ type, item });
    };

    const closeConfirmAction = () => {
        setPendingAction(null);
    };

    const openCloneModal = (item: AdminQuestionnaireItem) => {
        clearMessages();
        setCloneError(null);
        setCloneTarget(item);
        setCloneForm({
            version: '',
            name: item.name,
            description: item.description ?? ''
        });
    };

    const closeCloneModal = () => {
        setCloneTarget(null);
        setCloneForm(initialCloneForm());
        setCloneError(null);
    };

    const openCreateModal = () => {
        clearMessages();
        setCreateError(null);
        setCreateForm(initialCreateForm());
        setIsCreateModalOpen(true);
    };

    const closeCreateModal = () => {
        setIsCreateModalOpen(false);
        setCreateForm(initialCreateForm());
        setCreateError(null);
    };

    const handleConfirmAction = async () => {
        if (!pendingAction) return;

        const success = pendingAction.type === 'publish'
            ? await publishQuestionnaire(pendingAction.item.id)
            : await archiveQuestionnaire(pendingAction.item.id);

        if (success) {
            closeConfirmAction();
        }
    };

    const handleCloneSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!cloneTarget) return;

        if (!cloneForm.version.trim()) {
            setCloneError('La version es obligatoria.');
            return;
        }

        setCloneError(null);
        const success = await cloneQuestionnaire(cloneTarget.id, {
            version: cloneForm.version.trim(),
            name: cloneForm.name.trim() || undefined,
            description: cloneForm.description.trim() || undefined
        });

        if (success) {
            closeCloneModal();
        }
    };

    const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!createForm.name.trim()) {
            setCreateError('El nombre es obligatorio.');
            return;
        }
        if (!createForm.version.trim()) {
            setCreateError('La version es obligatoria.');
            return;
        }

        setCreateError(null);
        const success = await createQuestionnaireTemplate({
            name: createForm.name.trim(),
            version: createForm.version.trim(),
            description: createForm.description.trim() || undefined
        });

        if (success) {
            closeCreateModal();
        }
    };

    const handleManageQuestions = (item: AdminQuestionnaireItem) => {
        navigate(`/admin/cuestionarios/${item.id}/preguntas`, {
            state: {
                template: item
            }
        });
    };

    return (
        <div className="admin-page cuestionarios-page">
            <header className="admin-header">
                <div className="admin-title">
                    <h1>Cuestionarios</h1>
                </div>
                <div className="admin-actions">
                    <button type="button" className="admin-btn primary" onClick={openCreateModal}>
                        Crear plantilla
                    </button>
                </div>
            </header>

            <div className="admin-divider" aria-hidden="true" />

            {notice ? <div className="admin-alert success">{notice}</div> : null}
            {error ? <div className="admin-alert error">{error}</div> : null}

            <section className="admin-controls" aria-label="Controles de cuestionarios">
                <div className="admin-search">
                    <span className="admin-search-icon" aria-hidden="true">
                        <SearchIcon />
                    </span>
                    <input
                        type="search"
                        placeholder="Buscar por nombre"
                        aria-label="Buscar por nombre"
                        value={nameFilter}
                        onChange={(event) => setNameFilter(event.target.value)}
                    />
                </div>

                <div className="admin-filters">
                    <label>
                        <span>Version</span>
                        <input
                            className="cuestionarios-filter-input"
                            type="text"
                            value={versionFilter}
                            onChange={(event) => setVersionFilter(event.target.value)}
                            placeholder="Ej. v1"
                        />
                    </label>

                    <label>
                        <span>Estado</span>
                        <CustomSelect
                            ariaLabel="Filtrar por estado activo"
                            value={activeFilter}
                            options={activeOptions}
                            onChange={(value) => setActiveFilter(value as ToggleFilter)}
                        />
                    </label>

                    <label>
                        <span>Archivado</span>
                        <CustomSelect
                            ariaLabel="Filtrar por archivado"
                            value={archivedFilter}
                            options={archivedOptions}
                            onChange={(value) => setArchivedFilter(value as ToggleFilter)}
                        />
                    </label>

                    <label>
                        <span>Orden</span>
                        <CustomSelect
                            ariaLabel="Ordenar cuestionarios"
                            value={orderValue}
                            options={orderOptions}
                            onChange={(value) => {
                                const [nextSort, nextOrder] = value.split(':');
                                setOrdering(nextSort, (nextOrder === 'asc' ? 'asc' : 'desc'));
                            }}
                        />
                    </label>
                </div>
            </section>

            <section className="admin-table" aria-label="Listado de cuestionarios">
                <div className="admin-table-head cuestionarios-grid">
                    <span>Nombre</span>
                    <span>Version</span>
                    <span>Estado</span>
                    <span>Archivado</span>
                    <span>Creacion</span>
                    <span>Actualizacion</span>
                    <span>Acciones</span>
                </div>

                {loading ? <div className="admin-loading">Cargando cuestionarios...</div> : null}

                {!loading && items.length === 0 ? (
                    <div className="admin-empty" role="status">
                        <div className="admin-empty-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M5 4h14v16H5V4Zm2 2v12h10V6H7Zm2 2h6v2H9V8Zm0 4h6v2H9v-2Z" /></svg>
                        </div>
                        <h3>Sin cuestionarios</h3>
                        <p>No hay registros para los filtros actuales.</p>
                    </div>
                ) : null}

                {!loading && items.length > 0 ? (
                    <div className="admin-table-body">
                        {items.map((item) => (
                            <div key={item.id} className="admin-row cuestionarios-grid">
                                <div>
                                    <div className="cuestionarios-name">{item.name}</div>
                                    <div className="admin-muted" title={item.description ?? undefined}>
                                        {item.description?.trim() ? item.description : '--'}
                                    </div>
                                </div>
                                <div>{item.version}</div>
                                <div>
                                    <span className={`admin-status-badge ${item.is_active ? 'ok' : 'neutral'}`}>
                                        {item.is_active ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>
                                <div>
                                    <span className={`admin-status-badge ${item.is_archived ? 'archived' : 'neutral'}`}>
                                        {item.is_archived ? 'Si' : 'No'}
                                    </span>
                                </div>
                                <div>{formatDateTime(item.created_at)}</div>
                                <div>{formatDateTime(item.updated_at)}</div>
                                <div className="cuestionarios-actions">
                                    <button
                                        type="button"
                                        className="admin-btn ghost cuestionarios-action-btn"
                                        onClick={() => handleManageQuestions(item)}
                                    >
                                        Gestionar preguntas
                                    </button>
                                    <button
                                        type="button"
                                        className="admin-btn ghost cuestionarios-action-btn"
                                        onClick={() => openConfirmAction('publish', item)}
                                        disabled={submittingPublish || item.is_active || item.is_archived}
                                    >
                                        Publicar
                                    </button>
                                    <button
                                        type="button"
                                        className="admin-btn ghost cuestionarios-action-btn"
                                        onClick={() => openConfirmAction('archive', item)}
                                        disabled={submittingArchive || item.is_archived}
                                    >
                                        Archivar
                                    </button>
                                    <button
                                        type="button"
                                        className="admin-btn primary cuestionarios-action-btn"
                                        onClick={() => openCloneModal(item)}
                                        disabled={submittingClone}
                                    >
                                        Clonar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}
            </section>

            <footer className="admin-pagination" aria-label="Paginacion de cuestionarios">
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
                        <span>Tamaño</span>
                        <CustomSelect
                            ariaLabel="Tamaño de pagina"
                            value={String(pageSize)}
                            options={pageSizeOptions}
                            onChange={(value) => changePageSize(Number(value))}
                        />
                    </label>
                </div>
            </footer>

            <Modal isOpen={pendingAction !== null} onClose={closeConfirmAction}>
                <div className="admin-modal">
                    <h2>{pendingAction?.type === 'archive' ? 'Archivar cuestionario' : 'Publicar cuestionario'}</h2>
                    <p>
                        {pendingAction
                            ? `Confirma la accion sobre ${pendingAction.item.name} ${pendingAction.item.version}.`
                            : ''}
                    </p>
                    <div className="admin-modal-actions">
                        <button type="button" className="admin-btn ghost" onClick={closeConfirmAction}>
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="admin-btn primary"
                            onClick={() => void handleConfirmAction()}
                            disabled={submittingPublish || submittingArchive}
                        >
                            {submittingPublish || submittingArchive ? 'Procesando...' : 'Confirmar'}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={cloneTarget !== null} onClose={closeCloneModal}>
                <form className="admin-modal" onSubmit={handleCloneSubmit}>
                    <h2>Clonar cuestionario</h2>

                    <label>
                        <span>Version</span>
                        <input
                            type="text"
                            value={cloneForm.version}
                            onChange={(event) =>
                                setCloneForm((prev) => ({ ...prev, version: event.target.value }))
                            }
                        />
                    </label>

                    <label>
                        <span>Nombre</span>
                        <input
                            type="text"
                            value={cloneForm.name}
                            onChange={(event) =>
                                setCloneForm((prev) => ({ ...prev, name: event.target.value }))
                            }
                        />
                    </label>

                    <label>
                        <span>Descripcion</span>
                        <textarea
                            value={cloneForm.description}
                            onChange={(event) =>
                                setCloneForm((prev) => ({ ...prev, description: event.target.value }))
                            }
                        />
                    </label>

                    {cloneError ? <div className="admin-alert error">{cloneError}</div> : null}

                    <div className="admin-modal-actions">
                        <button type="button" className="admin-btn ghost" onClick={closeCloneModal}>
                            Cancelar
                        </button>
                        <button type="submit" className="admin-btn primary" disabled={submittingClone}>
                            {submittingClone ? 'Clonando...' : 'Clonar'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isCreateModalOpen} onClose={closeCreateModal}>
                <form className="admin-modal" onSubmit={handleCreateSubmit}>
                    <h2>Crear plantilla</h2>

                    <label>
                        <span>Nombre</span>
                        <input
                            type="text"
                            value={createForm.name}
                            onChange={(event) =>
                                setCreateForm((prev) => ({ ...prev, name: event.target.value }))
                            }
                        />
                    </label>

                    <label>
                        <span>Version</span>
                        <input
                            type="text"
                            value={createForm.version}
                            onChange={(event) =>
                                setCreateForm((prev) => ({ ...prev, version: event.target.value }))
                            }
                        />
                    </label>

                    <label>
                        <span>Descripcion</span>
                        <textarea
                            value={createForm.description}
                            onChange={(event) =>
                                setCreateForm((prev) => ({ ...prev, description: event.target.value }))
                            }
                        />
                    </label>

                    {createError ? <div className="admin-alert error">{createError}</div> : null}

                    <div className="admin-modal-actions">
                        <button type="button" className="admin-btn ghost" onClick={closeCreateModal}>
                            Cancelar
                        </button>
                        <button type="submit" className="admin-btn primary" disabled={submittingCreate}>
                            {submittingCreate ? 'Creando...' : 'Crear plantilla'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
