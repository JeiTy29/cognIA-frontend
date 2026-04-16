import { useMemo, useState } from 'react';
import { Modal } from '../../../components/Modal/Modal';
import { CustomSelect } from '../../../components/CustomSelect/CustomSelect';
import { useUsers } from '../../../hooks/useUsers';
import type { CreateUserRequest, UpdateUserRequest, User } from '../../../services/admin/users';
import './Usuarios.css';

type CreateFormState = {
    username: string;
    email: string;
    password: string;
    full_name: string;
    user_type: 'guardian' | 'psychologist';
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
    user_type: 'guardian' | 'psychologist';
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
type PendingAdminAction = 'passwordReset' | 'mfaReset';

const statusFilterOptions = [
    { value: 'Todos', label: 'Todos' },
    { value: 'Activos', label: 'Activos' },
    { value: 'Inactivos', label: 'Inactivos' }
];

const roleFilterOptions = [
    { value: 'Todos', label: 'Todos' },
    { value: 'Admin', label: 'Admin' },
    { value: 'Psicologo', label: 'Psicologo' },
    { value: 'Padre/Tutor', label: 'Padre/Tutor' }
];

const userTypeCreateOptions = [
    { value: 'guardian', label: 'Padre/Tutor' },
    { value: 'psychologist', label: 'Psicologo' }
];

const userTypeEditOptions = [
    { value: 'guardian', label: 'Padre/Tutor' },
    { value: 'psychologist', label: 'Psicologo' }
];

const userRoleOptions = [
    { value: 'GUARDIAN', label: 'Padre/Tutor' },
    { value: 'PSYCHOLOGIST', label: 'Psicologo' },
    { value: 'ADMIN', label: 'Administrador' }
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

function normalizeRoleKey(role: string): UserRoleKey {
    const normalized = role.trim().toUpperCase();
    if (normalized === 'ADMIN') return 'ADMIN';
    if (normalized === 'PSYCHOLOGIST') return 'PSYCHOLOGIST';
    if (normalized === 'GUARDIAN') return 'GUARDIAN';
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
}) {
    const { userType, fullName, professionalCardNumber, password, isCreate } = params;

    if (!['guardian', 'psychologist'].includes(userType)) {
        return 'Solicitud invalida. Revisa los datos e intenta de nuevo.';
    }

    if (userType === 'psychologist' && fullName.trim().length === 0) {
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
        submittingPasswordReset,
        submittingMfaReset,
        loadUsers,
        goToPage,
        changePageSize,
        fetchUserDetail,
        createUser,
        updateUser,
        deactivateUser,
        resetUserPassword,
        resetUserMfa,
        clearMessages
    } = useUsers();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
    const [pendingAdminAction, setPendingAdminAction] = useState<PendingAdminAction | null>(null);

    const [createForm, setCreateForm] = useState<CreateFormState>(initialCreateForm);
    const [editForm, setEditForm] = useState<EditFormState | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('Todos');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('Todos');
    const [copiedUserId, setCopiedUserId] = useState<string | null>(null);

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
            user_type: detail.user_type === 'psychologist' ? 'psychologist' : 'guardian',
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

    const openAdminActionModal = (user: User, action: PendingAdminAction) => {
        clearMessages();
        setSelectedUser(user);
        setPendingAdminAction(action);
    };

    const closeAdminActionModal = () => {
        setSelectedUser(null);
        setPendingAdminAction(null);
    };

    const handleCreateSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        const validationError = validateUserForm({
            userType: createForm.user_type,
            fullName: createForm.full_name,
            professionalCardNumber: createForm.professional_card_number,
            password: createForm.password,
            isCreate: true
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

    const handleAdminActionConfirm = async () => {
        if (!selectedUser || !pendingAdminAction) return;

        const success = pendingAdminAction === 'passwordReset'
            ? await resetUserPassword(selectedUser.id)
            : await resetUserMfa(selectedUser.id);

        if (success) {
            closeAdminActionModal();
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('Todos');
        setRoleFilter('Todos');
    };

    const handleCopyUserId = async (userId: string) => {
        try {
            await navigator.clipboard.writeText(userId);
            setCopiedUserId(userId);
            window.setTimeout(() => {
                setCopiedUserId((prev) => (prev === userId ? null : prev));
            }, 1500);
        } catch {
            setCopiedUserId(null);
        }
    };

    const adminActionTitle = pendingAdminAction === 'passwordReset'
        ? 'Restablecer contrasena'
        : 'Resetear MFA';
    const adminActionLoading = pendingAdminAction === 'passwordReset'
        ? submittingPasswordReset
        : submittingMfaReset;
    const adminActionMessage = pendingAdminAction === 'passwordReset'
        ? `Confirma si deseas emitir el restablecimiento de contrasena para ${selectedUser?.username ?? ''}.`
        : `Confirma si deseas resetear MFA para ${selectedUser?.username ?? ''}.`;

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
                        <CustomSelect
                            ariaLabel="Estado"
                            value={statusFilter}
                            options={statusFilterOptions}
                            onChange={(value) => setStatusFilter(value as StatusFilter)}
                        />
                    </label>
                    <label>
                        <span>Rol</span>
                        <CustomSelect
                            ariaLabel="Rol"
                            value={roleFilter}
                            options={roleFilterOptions}
                            onChange={(value) => setRoleFilter(value as RoleFilter)}
                        />
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
                                <div className="usuarios-cell id">
                                    <div className="usuarios-id-wrap">
                                        <span className="usuarios-id-value">{user.id}</span>
                                        <button
                                            type="button"
                                            className="icon-btn usuarios-id-copy has-tooltip"
                                            data-tooltip={copiedUserId === user.id ? 'ID copiado' : 'Copiar ID al portapapeles'}
                                            aria-label="Copiar ID al portapapeles"
                                            onClick={() => void handleCopyUserId(user.id)}
                                        >
                                            <svg viewBox="0 0 24 24">
                                                <path d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1Zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H10V7h9v14Z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
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
                                    <button
                                        type="button"
                                        className="icon-btn has-tooltip"
                                        data-tooltip="Editar usuario"
                                        aria-label="Editar usuario"
                                        onClick={() => void openEditModal(user)}
                                    >
                                        <svg viewBox="0 0 24 24"><path d="m3 17 1 4 4-1 10-10-4-4L3 17Zm14-12 4 4 1-1-4-4Z" /></svg>
                                    </button>
                                    <button
                                        type="button"
                                        className="icon-btn has-tooltip"
                                        data-tooltip="Restablecer contrasena"
                                        aria-label="Restablecer contrasena"
                                        onClick={() => openAdminActionModal(user, 'passwordReset')}
                                    >
                                        <svg viewBox="0 0 24 24">
                                            <path d="M7 10a5 5 0 1 1 9.9 1H19a1 1 0 0 1 .8 1.6l-2.5 3.33a1 1 0 0 1-1.6 0l-2.5-3.33A1 1 0 0 1 14 11h1a3 3 0 1 0-5.92.75l-1.96.41A5.11 5.11 0 0 1 7 10Zm5 3a2 2 0 0 1 2 2v3h-2v-3h-2v3H8v-3a2 2 0 0 1 2-2Z" />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        className="icon-btn has-tooltip"
                                        data-tooltip="Resetear MFA"
                                        aria-label="Resetear MFA"
                                        onClick={() => openAdminActionModal(user, 'mfaReset')}
                                    >
                                        <svg viewBox="0 0 24 24">
                                            <path d="M12 2 4 5v6c0 5 3.4 9.74 8 11 4.6-1.26 8-6 8-11V5Zm0 2.13 6 2.25V11c0 3.87-2.5 7.66-6 8.86C8.5 18.66 6 14.87 6 11V6.38ZM11 7h2v5h-2Zm0 7h2v2h-2Z" />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        className="icon-btn has-tooltip"
                                        data-tooltip="Desactivar usuario"
                                        aria-label="Desactivar usuario"
                                        onClick={() => openDeactivateModal(user)}
                                    >
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
                        className="icon-btn usuarios-page-nav-btn"
                        aria-label="Pagina anterior"
                        onClick={() => void goToPage(Math.max(1, page - 1))}
                        disabled={loading || page <= 1}
                    >
                        <svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7" /></svg>
                    </button>
                    <span className="usuarios-page">Pagina {page}</span>
                    <button
                        type="button"
                        className="icon-btn usuarios-page-nav-btn"
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
                        <CustomSelect
                            ariaLabel="Tamaño de pagina"
                            value={String(pageSize)}
                            options={pageSizeOptions}
                            onChange={(value) => void changePageSize(Number(value))}
                        />
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
                        <CustomSelect
                            ariaLabel="Tipo de usuario"
                            value={createForm.user_type}
                            options={userTypeCreateOptions}
                            onChange={(value) =>
                                setCreateForm((prev) => ({
                                    ...prev,
                                    user_type: value as CreateFormState['user_type']
                                }))
                            }
                        />
                    </label>
                    <label>
                        <span>Rol</span>
                        <CustomSelect
                            ariaLabel="Rol del usuario"
                            value={createForm.role}
                            options={userRoleOptions}
                            onChange={(value) =>
                                setCreateForm((prev) => ({
                                    ...prev,
                                    role: value as CreateFormState['role']
                                }))
                            }
                        />
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
                                <CustomSelect
                                    ariaLabel="Tipo de usuario"
                                    value={editForm.user_type}
                                    options={userTypeEditOptions}
                                    onChange={(value) =>
                                        setEditForm((prev) =>
                                            prev
                                                ? {
                                                      ...prev,
                                                      user_type: value as EditFormState['user_type']
                                                  }
                                                : prev
                                        )
                                    }
                                />
                            </label>
                            <label>
                                <span>Rol</span>
                                <CustomSelect
                                    ariaLabel="Rol del usuario"
                                    value={editForm.role}
                                    options={userRoleOptions}
                                    onChange={(value) =>
                                        setEditForm((prev) =>
                                            prev
                                                ? {
                                                      ...prev,
                                                      role: value as EditFormState['role']
                                                  }
                                                : prev
                                        )
                                    }
                                />
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

            <Modal isOpen={pendingAdminAction !== null} onClose={closeAdminActionModal}>
                <div className="usuarios-modal">
                    <h2>{adminActionTitle}</h2>
                    <p>{adminActionMessage}</p>
                    <div className="usuarios-modal-actions">
                        <button type="button" className="usuarios-btn ghost" onClick={closeAdminActionModal}>Cancelar</button>
                        <button
                            type="button"
                            className="usuarios-btn primary"
                            onClick={() => void handleAdminActionConfirm()}
                            disabled={adminActionLoading}
                        >
                            {adminActionLoading ? 'Procesando...' : 'Confirmar'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
