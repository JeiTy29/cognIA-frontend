import { useMemo, useState } from 'react';
import { Modal } from '../../../components/Modal/Modal';
import { useUsers } from '../../../hooks/useUsers';
import type { CreateUserRequest, UpdateUserRequest, User } from '../../../services/admin/users';
import './Usuarios.css';

type CreateFormState = {
    username: string;
    email: string;
    password: string;
    full_name: string;
    user_type: 'guardian' | 'psychologist' | 'admin';
    professional_card_number: string;
    role: 'GUARDIAN' | 'PSYCHOLOGIST' | 'ADMIN';
    is_active: boolean;
};

type EditFormState = {
    id: string;
    username: string;
    email: string;
    password: string;
    full_name: string;
    user_type: 'guardian' | 'teacher' | 'psychologist';
    professional_card_number: string;
    role: 'GUARDIAN' | 'PSYCHOLOGIST' | 'ADMIN';
    is_active: boolean;
};

const initialCreateForm: CreateFormState = {
    username: '',
    email: '',
    password: '',
    full_name: '',
    user_type: 'guardian',
    professional_card_number: '',
    role: 'GUARDIAN',
    is_active: true
};

type StatusFilter = 'Todos' | 'Activos' | 'Inactivos';
type RoleFilter = 'Todos' | 'Admin' | 'Psicologo' | 'Padre/Tutor';
type UserRoleKey = 'ADMIN' | 'PSYCHOLOGIST' | 'GUARDIAN';

function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleDateString('es-CO');
}

function normalizeRoleKey(role: string): UserRoleKey {
    const normalized = role.trim().toUpperCase();
    if (normalized === 'ADMIN') return 'ADMIN';
    if (normalized === 'PSYCHOLOGIST') return 'PSYCHOLOGIST';
    if (normalized === 'GUARDIAN' || normalized === 'TEACHER') return 'GUARDIAN';
    return 'GUARDIAN';
}

function roleLabelFromKey(role: UserRoleKey) {
    if (role === 'ADMIN') return 'Administrador';
    if (role === 'PSYCHOLOGIST') return 'Psicologo';
    return 'Padre/Tutor';
}

function resolveUserRoleKey(user: User): UserRoleKey {
    if (user.roles && user.roles.length > 0) {
        return normalizeRoleKey(user.roles[0]);
    }
    return normalizeRoleKey(user.user_type);
}

function resolveUserLabel(user: User) {
    return roleLabelFromKey(resolveUserRoleKey(user));
}

function validateUserForm(params: {
    userType: string;
    fullName: string;
    professionalCardNumber: string;
    password?: string;
    isCreate: boolean;
    roles: string[];
}) {
    const { userType, fullName, professionalCardNumber, password, isCreate, roles } = params;

    if (!['guardian', 'admin', 'psychologist', 'teacher'].includes(userType)) {
        return 'Solicitud invalida. Revisa los datos e intenta de nuevo.';
    }

    const hasAdminRole = roles.map((role) => role.toUpperCase()).includes('ADMIN');

    if ((userType === 'psychologist' || hasAdminRole) && fullName.trim().length === 0) {
        return 'Solicitud invalida. Revisa los datos e intenta de nuevo.';
    }

    if (userType === 'psychologist' && professionalCardNumber.trim().length === 0) {
        return 'Solicitud invalida. Revisa los datos e intenta de nuevo.';
    }

    if (isCreate && (!password || password.trim().length === 0)) {
        return 'Solicitud invalida. Revisa los datos e intenta de nuevo.';
    }

    return null;
}

export default function Usuarios() {
    const {
        items,
        page,
        pageSize,
        total,
        loading,
        error,
        notice,
        loadingDetail,
        submittingCreate,
        submittingUpdate,
        submittingDeactivate,
        loadUsers,
        goToPage,
        changePageSize,
        fetchUserDetail,
        createUser,
        updateUser,
        deactivateUser,
        clearMessages
    } = useUsers();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);

    const [createForm, setCreateForm] = useState<CreateFormState>(initialCreateForm);
    const [editForm, setEditForm] = useState<EditFormState | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('Todos');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('Todos');

    const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const showingTo = Math.min(page * pageSize, total);

    const rows = useMemo(
        () =>
            items.map((user) => ({
                ...user,
                fullName: user.full_name && user.full_name.trim().length > 0 ? user.full_name : 'Sin nombre',
                roleLabel: resolveUserLabel(user)
            })),
        [items]
    );

    const filteredRows = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        return rows.filter((user) => {
            const matchesSearch =
                normalizedSearch.length === 0
                    ? true
                    : user.username.toLowerCase().includes(normalizedSearch) ||
                      user.id.toLowerCase().includes(normalizedSearch);
            const matchesStatus =
                statusFilter === 'Todos' ||
                (statusFilter === 'Activos' ? user.is_active : !user.is_active);
            const userRoleKey = resolveUserRoleKey(user);
            const matchesRole =
                roleFilter === 'Todos' ||
                (roleFilter === 'Admin' && userRoleKey === 'ADMIN') ||
                (roleFilter === 'Psicologo' && userRoleKey === 'PSYCHOLOGIST') ||
                (roleFilter === 'Padre/Tutor' && userRoleKey === 'GUARDIAN');
            return matchesSearch && matchesStatus && matchesRole;
        });
    }, [rows, searchTerm, statusFilter, roleFilter]);

    const hasActiveFilters = searchTerm.trim().length > 0 || statusFilter !== 'Todos' || roleFilter !== 'Todos';
    const displayTotal = hasActiveFilters ? filteredRows.length : total;
    const displayFrom = displayTotal === 0 ? 0 : hasActiveFilters ? 1 : showingFrom;
    const displayTo = hasActiveFilters ? filteredRows.length : showingTo;
    const nextDisabled = loading || showingTo >= total;

    const openCreateModal = () => {
        clearMessages();
        setFormError(null);
        setCreateForm(initialCreateForm);
        setIsCreateOpen(true);
    };

    const closeCreateModal = () => {
        setIsCreateOpen(false);
        setFormError(null);
    };

    const openEditModal = async (user: User) => {
        clearMessages();
        setFormError(null);
        setIsEditOpen(true);
        const detail = await fetchUserDetail(user.id);
        if (!detail) return;

        setEditForm({
            id: detail.id,
            username: detail.username,
            email: detail.email,
            password: '',
            full_name: detail.full_name ?? '',
            user_type: (detail.user_type === 'teacher' ? 'teacher' : detail.user_type === 'psychologist' ? 'psychologist' : 'guardian'),
            professional_card_number: detail.professional_card_number ?? '',
            role: (detail.roles?.[0]?.toUpperCase() === 'ADMIN'
                ? 'ADMIN'
                : detail.roles?.[0]?.toUpperCase() === 'PSYCHOLOGIST'
                    ? 'PSYCHOLOGIST'
                    : 'GUARDIAN')
        ,
            is_active: detail.is_active
        });
    };

    const closeEditModal = () => {
        setIsEditOpen(false);
        setEditForm(null);
        setFormError(null);
    };

    const openDeactivateModal = (user: User) => {
        clearMessages();
        setSelectedUser(user);
        setIsDeactivateOpen(true);
    };

    const closeDeactivateModal = () => {
        setSelectedUser(null);
        setIsDeactivateOpen(false);
    };

    const handleCreateSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        const validationError = validateUserForm({
            userType: createForm.user_type,
            fullName: createForm.full_name,
            professionalCardNumber: createForm.professional_card_number,
            password: createForm.password,
            isCreate: true,
            roles: [createForm.role]
        });
        if (validationError) {
            setFormError(validationError);
            return;
        }

        const payload: CreateUserRequest = {
            username: createForm.username.trim(),
            email: createForm.email.trim(),
            password: createForm.password,
            user_type: createForm.user_type,
            roles: [createForm.role],
            is_active: createForm.is_active,
            ...(createForm.full_name.trim().length > 0 ? { full_name: createForm.full_name.trim() } : {}),
            ...(createForm.professional_card_number.trim().length > 0
                ? { professional_card_number: createForm.professional_card_number.trim() }
                : {})
        };

        const created = await createUser(payload);
        if (created) {
            closeCreateModal();
        }
    };

    const handleEditSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!editForm) return;

        const validationError = validateUserForm({
            userType: editForm.user_type,
            fullName: editForm.full_name,
            professionalCardNumber: editForm.professional_card_number,
            isCreate: false,
            roles: [editForm.role],
            password: editForm.password
        });
        if (validationError) {
            setFormError(validationError);
            return;
        }

        const payload: UpdateUserRequest = {
            email: editForm.email.trim(),
            user_type: editForm.user_type,
            roles: [editForm.role],
            is_active: editForm.is_active,
            ...(editForm.password.trim().length > 0 ? { password: editForm.password } : {}),
            ...(editForm.full_name.trim().length > 0 ? { full_name: editForm.full_name.trim() } : { full_name: '' }),
            ...(editForm.professional_card_number.trim().length > 0
                ? { professional_card_number: editForm.professional_card_number.trim() }
                : { professional_card_number: '' })
        };

        const updated = await updateUser(editForm.id, payload);
        if (updated) {
            closeEditModal();
        }
    };

    const handleDeactivateConfirm = async () => {
        if (!selectedUser) return;
        const deactivated = await deactivateUser(selectedUser.id);
        if (deactivated) {
            closeDeactivateModal();
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('Todos');
        setRoleFilter('Todos');
    };

    return (
        <div className="usuarios">
            <header className="usuarios-header">
                <div className="usuarios-title">
                    <div>
                        <h1>Usuarios</h1>
                        <p>Gestiona cuentas registradas, roles y estados en la plataforma.</p>
                    </div>
                </div>
                <div className="usuarios-actions">
                    <button type="button" className="usuarios-btn primary usuarios-btn-create" aria-label="Crear nuevo usuario" onClick={openCreateModal}>
                        <span className="usuarios-btn-create-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M11 4h2v6h6v2h-6v6h-2v-6H5v-2h6Z" /></svg>
                        </span>
                        Crear nuevo usuario
                    </button>
                </div>
            </header>

            <div className="usuarios-divider" aria-hidden="true" />

            {notice ? <div className="usuarios-alert success">{notice}</div> : null}
            {error ? (
                <div className="usuarios-alert error">
                    <span>{error}</span>
                    <button type="button" className="usuarios-btn ghost" onClick={() => void loadUsers(page, pageSize)}>
                        Reintentar
                    </button>
                </div>
            ) : null}

            <section className="usuarios-controls" aria-label="Controles de busqueda">
                <div className="usuarios-search">
                    <span className="usuarios-search-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M11 4a7 7 0 1 1-4.95 11.95l-3.5 3.5 1.4 1.4 3.5-3.5A7 7 0 0 1 11 4Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" /></svg>
                    </span>
                    <input
                        type="search"
                        placeholder="Buscar por ID o usuario..."
                        aria-label="Buscar por ID o usuario"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                    />
                </div>
                <div className="usuarios-filters">
                    <label>
                        <span>Estado</span>
                        <span className="app-select-wrap">
                            <select
                                className="app-select"
                                aria-label="Estado"
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                            >
                                <option>Todos</option>
                                <option>Activos</option>
                                <option>Inactivos</option>
                            </select>
                        </span>
                    </label>
                    <label>
                        <span>Rol</span>
                        <span className="app-select-wrap">
                            <select
                                className="app-select"
                                aria-label="Rol"
                                value={roleFilter}
                                onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
                            >
                                <option>Todos</option>
                                <option>Admin</option>
                                <option>Psicologo</option>
                                <option>Padre/Tutor</option>
                            </select>
                        </span>
                    </label>
                    <button type="button" className="usuarios-btn ghost" aria-label="Limpiar filtros" onClick={clearFilters}>
                        <span aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M6 6h12v2H6zm3 5h6v2H9zm-2 5h10v2H7z" /></svg>
                        </span>
                        Limpiar
                    </button>
                </div>
            </section>

            <section className="usuarios-table" aria-label="Listado de usuarios">
                <div className="usuarios-table-head">
                    <span>ID</span>
                    <span>Usuario</span>
                    <span>Correo</span>
                    <span>Rol</span>
                    <span>Estado</span>
                    <span>Creado</span>
                    <span>Acciones</span>
                </div>

                {loading ? (
                    <div className="usuarios-skeleton">
                        {Array.from({ length: 7 }).map((_, index) => (
                            <div key={`skeleton-${index}`} className="usuarios-skeleton-row">
                                <span />
                                <span />
                                <span />
                                <span />
                                <span />
                                <span />
                                <span />
                            </div>
                        ))}
                    </div>
                ) : null}

                {!loading && filteredRows.length === 0 ? (
                    <div className="usuarios-empty" role="status">
                        <div className="usuarios-empty-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" /></svg>
                        </div>
                        <h3>Sin usuarios</h3>
                        <p>No hay registros disponibles con los filtros actuales.</p>
                        <button type="button" className="usuarios-btn primary usuarios-btn-create" onClick={openCreateModal}>
                            <span className="usuarios-btn-create-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24"><path d="M11 4h2v6h6v2h-6v6h-2v-6H5v-2h6Z" /></svg>
                            </span>
                            Crear nuevo usuario
                        </button>
                    </div>
                ) : null}

                {!loading && filteredRows.length > 0 ? (
                    <div className="usuarios-table-body">
                        {filteredRows.map((user) => (
                            <div key={user.id} className="usuarios-row">
                                <div className="usuarios-cell id">{user.id}</div>
                                <div className="usuarios-cell user">
                                    <div className="usuarios-name">{user.fullName}</div>
                                    <div className="usuarios-sub">{user.username}</div>
                                </div>
                                <div className="usuarios-cell">{user.email}</div>
                                <div className="usuarios-cell">
                                    <div className="usuarios-type">{user.roleLabel}</div>
                                    {user.professional_card_number ? (
                                        <div className="usuarios-sub">TP: {user.professional_card_number}</div>
                                    ) : null}
                                </div>
                                <div className="usuarios-cell status">
                                    <span className={`status-dot ${user.is_active ? 'active' : 'inactive'}`} aria-hidden="true" />
                                    <span>{user.is_active ? 'Activo' : 'Inactivo'}</span>
                                </div>
                                <div className="usuarios-cell">{formatDate(user.created_at)}</div>
                                <div className="usuarios-cell actions">
                                    <button type="button" className="icon-btn" aria-label="Ver usuario" onClick={() => void openEditModal(user)}>
                                        <svg viewBox="0 0 24 24"><path d="M12 5c5 0 9 5 9 7s-4 7-9 7-9-5-9-7 4-7 9-7Zm0 2c-3.4 0-6.4 3.2-6.8 5 .4 1.8 3.4 5 6.8 5s6.4-3.2 6.8-5c-.4-1.8-3.4-5-6.8-5Zm0 2.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z" /></svg>
                                    </button>
                                    <button type="button" className="icon-btn" aria-label="Editar usuario" onClick={() => void openEditModal(user)}>
                                        <svg viewBox="0 0 24 24"><path d="m3 17 1 4 4-1 10-10-4-4L3 17Zm14-12 4 4 1-1-4-4Z" /></svg>
                                    </button>
                                    <button type="button" className="icon-btn" aria-label="Desactivar usuario" onClick={() => openDeactivateModal(user)}>
                                        <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm6.4 10a6.4 6.4 0 0 1-1.2 3.6L8.4 6.8A6.4 6.4 0 0 1 18.4 12Zm-12.8 0a6.4 6.4 0 0 1 1.2-3.6l8.8 8.8A6.4 6.4 0 0 1 5.6 12Z" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}
            </section>

            <footer className="usuarios-pagination" aria-label="Paginacion">
                <div className="usuarios-pagination-info">
                    Mostrando {displayFrom}-{displayTo} de {displayTotal}
                </div>
                <div className="usuarios-pagination-controls">
                    <button
                        type="button"
                        className="icon-btn"
                        aria-label="Pagina anterior"
                        onClick={() => void goToPage(Math.max(1, page - 1))}
                        disabled={loading || page <= 1}
                    >
                        <svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7" /></svg>
                    </button>
                    <span className="usuarios-page">Pagina {page}</span>
                    <button
                        type="button"
                        className="icon-btn"
                        aria-label="Pagina siguiente"
                        onClick={() => void goToPage(page + 1)}
                        disabled={nextDisabled}
                    >
                        <svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" /></svg>
                    </button>
                </div>
                <div className="usuarios-page-size">
                    <label>
                        <span>Tamaño</span>
                        <span className="app-select-wrap">
                            <select
                                className="app-select"
                                aria-label="Tamaño de pagina"
                                value={String(pageSize)}
                                onChange={(event) => void changePageSize(Number(event.target.value))}
                            >
                                <option value="10">10</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                            </select>
                        </span>
                    </label>
                </div>
            </footer>

            <Modal isOpen={isCreateOpen} onClose={closeCreateModal}>
                <form className="usuarios-modal" onSubmit={handleCreateSubmit}>
                    <h2>Nuevo usuario</h2>
                    {formError ? <div className="usuarios-alert error">{formError}</div> : null}
                    <label>
                        <span>Usuario</span>
                        <input
                            required
                            value={createForm.username}
                            onChange={(event) => setCreateForm((prev) => ({ ...prev, username: event.target.value }))}
                        />
                    </label>
                    <label>
                        <span>Correo</span>
                        <input
                            type="email"
                            required
                            value={createForm.email}
                            onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
                        />
                    </label>
                    <label>
                        <span>Contrasena</span>
                        <input
                            type="password"
                            required
                            value={createForm.password}
                            onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
                        />
                    </label>
                    <label>
                        <span>Tipo</span>
                        <span className="app-select-wrap">
                            <select
                                className="app-select"
                                value={createForm.user_type}
                                onChange={(event) =>
                                    setCreateForm((prev) => ({
                                        ...prev,
                                        user_type: event.target.value as CreateFormState['user_type']
                                    }))
                                }
                            >
                                <option value="guardian">Padre/Tutor</option>
                                <option value="psychologist">Psicologo</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </span>
                    </label>
                    <label>
                        <span>Rol</span>
                        <span className="app-select-wrap">
                            <select
                                className="app-select"
                                value={createForm.role}
                                onChange={(event) =>
                                    setCreateForm((prev) => ({
                                        ...prev,
                                        role: event.target.value as CreateFormState['role']
                                    }))
                                }
                            >
                                <option value="GUARDIAN">Padre/Tutor</option>
                                <option value="PSYCHOLOGIST">Psicologo</option>
                                <option value="ADMIN">Administrador</option>
                            </select>
                        </span>
                    </label>
                    <label>
                        <span>Nombre completo</span>
                        <input
                            value={createForm.full_name}
                            onChange={(event) => setCreateForm((prev) => ({ ...prev, full_name: event.target.value }))}
                        />
                    </label>
                    <label>
                        <span>Tarjeta profesional</span>
                        <input
                            value={createForm.professional_card_number}
                            onChange={(event) =>
                                setCreateForm((prev) => ({ ...prev, professional_card_number: event.target.value }))
                            }
                        />
                    </label>
                    <div className="usuarios-modal-actions">
                        <button type="button" className="usuarios-btn ghost" onClick={closeCreateModal}>Cancelar</button>
                        <button type="submit" className="usuarios-btn primary" disabled={submittingCreate}>
                            {submittingCreate ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isEditOpen} onClose={closeEditModal}>
                <form className="usuarios-modal" onSubmit={handleEditSubmit}>
                    <h2>Editar usuario</h2>
                    {formError ? <div className="usuarios-alert error">{formError}</div> : null}
                    {loadingDetail || !editForm ? (
                        <div className="usuarios-modal-loading">Cargando datos del usuario...</div>
                    ) : (
                        <>
                            <label>
                                <span>Usuario</span>
                                <input value={editForm.username} readOnly />
                            </label>
                            <label>
                                <span>Correo</span>
                                <input
                                    type="email"
                                    required
                                    value={editForm.email}
                                    onChange={(event) => setEditForm((prev) => prev ? ({ ...prev, email: event.target.value }) : prev)}
                                />
                            </label>
                            <label>
                                <span>Nueva contrasena (opcional)</span>
                                <input
                                    type="password"
                                    value={editForm.password}
                                    onChange={(event) => setEditForm((prev) => prev ? ({ ...prev, password: event.target.value }) : prev)}
                                />
                            </label>
                            <label>
                                <span>Tipo</span>
                                <span className="app-select-wrap">
                                    <select
                                        className="app-select"
                                        value={editForm.user_type}
                                        onChange={(event) =>
                                            setEditForm((prev) =>
                                                prev
                                                    ? {
                                                          ...prev,
                                                          user_type: event.target.value as EditFormState['user_type']
                                                      }
                                                    : prev
                                            )
                                        }
                                    >
                                        <option value="guardian">Padre/Tutor</option>
                                        <option value="psychologist">Psicologo</option>
                                        <option value="teacher">Docente</option>
                                    </select>
                                </span>
                            </label>
                            <label>
                                <span>Rol</span>
                                <span className="app-select-wrap">
                                    <select
                                        className="app-select"
                                        value={editForm.role}
                                        onChange={(event) =>
                                            setEditForm((prev) =>
                                                prev
                                                    ? {
                                                          ...prev,
                                                          role: event.target.value as EditFormState['role']
                                                      }
                                                    : prev
                                            )
                                        }
                                    >
                                        <option value="GUARDIAN">Padre/Tutor</option>
                                        <option value="PSYCHOLOGIST">Psicologo</option>
                                        <option value="ADMIN">Administrador</option>
                                    </select>
                                </span>
                            </label>
                            <label>
                                <span>Nombre completo</span>
                                <input
                                    value={editForm.full_name}
                                    onChange={(event) =>
                                        setEditForm((prev) => prev ? ({ ...prev, full_name: event.target.value }) : prev)
                                    }
                                />
                            </label>
                            <label>
                                <span>Tarjeta profesional</span>
                                <input
                                    value={editForm.professional_card_number}
                                    onChange={(event) =>
                                        setEditForm((prev) =>
                                            prev
                                                ? {
                                                      ...prev,
                                                      professional_card_number: event.target.value
                                                  }
                                                : prev
                                        )
                                    }
                                />
                            </label>
                            <label className="usuarios-switch">
                                <input
                                    type="checkbox"
                                    checked={editForm.is_active}
                                    onChange={(event) =>
                                        setEditForm((prev) => prev ? ({ ...prev, is_active: event.target.checked }) : prev)
                                    }
                                />
                                <span>Usuario activo</span>
                            </label>
                        </>
                    )}
                    <div className="usuarios-modal-actions">
                        <button type="button" className="usuarios-btn ghost" onClick={closeEditModal}>Cancelar</button>
                        <button type="submit" className="usuarios-btn primary" disabled={submittingUpdate || loadingDetail || !editForm}>
                            {submittingUpdate ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isDeactivateOpen} onClose={closeDeactivateModal}>
                <div className="usuarios-modal">
                    <h2>Desactivar usuario</h2>
                    <p>
                        Confirma si deseas desactivar al usuario <strong>{selectedUser?.username ?? ''}</strong>.
                    </p>
                    <div className="usuarios-modal-actions">
                        <button type="button" className="usuarios-btn ghost" onClick={closeDeactivateModal}>Cancelar</button>
                        <button
                            type="button"
                            className="usuarios-btn primary"
                            onClick={() => void handleDeactivateConfirm()}
                            disabled={submittingDeactivate}
                        >
                            {submittingDeactivate ? 'Desactivando...' : 'Desactivar'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
