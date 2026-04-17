import { type FormEvent, useMemo, useState } from 'react';
import { Modal } from '../../../components/Modal/Modal';
import { CustomSelect, type CustomSelectOption } from '../../../components/CustomSelect/CustomSelect';
import { useUsers } from '../../../hooks/useUsers';
import type { CreateUserRequest, User } from '../../../services/admin/users';
import './Usuarios.css';

type CreateFormState = {
    username: string;
    email: string;
    password: string;
    full_name: string;
    user_type: 'guardian' | 'psychologist';
    professional_card_number: string;
    role: string;
    is_active: boolean;
};

type EditFormState = {
    id: string;
    email: string;
    full_name: string;
    user_type: 'guardian' | 'psychologist';
    professional_card_number: string;
    role: string;
    is_active: boolean;
};

type FormErrors = Partial<Record<keyof CreateFormState | keyof EditFormState, string>>;

const roleOptions: CustomSelectOption[] = [
    { value: 'GUARDIAN', label: 'Padre/Tutor' },
    { value: 'PSYCHOLOGIST', label: 'Psicologo' },
    { value: 'ADMIN', label: 'Administrador' }
];

const typeOptions: CustomSelectOption[] = [
    { value: 'guardian', label: 'Padre/Tutor' },
    { value: 'psychologist', label: 'Psicologo' }
];

const statusOptions: CustomSelectOption[] = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' }
];

const roleFilterOptions: CustomSelectOption[] = [
    { value: 'all', label: 'Todos los roles' },
    ...roleOptions
];

const typeFilterOptions: CustomSelectOption[] = [
    { value: 'all', label: 'Todos los tipos' },
    ...typeOptions
];

const pageSizeOptions: CustomSelectOption[] = [
    { value: '10', label: '10 por pagina' },
    { value: '20', label: '20 por pagina' },
    { value: '50', label: '50 por pagina' }
];

const initialCreateForm = (): CreateFormState => ({
    username: '',
    email: '',
    password: '',
    full_name: '',
    user_type: 'guardian',
    professional_card_number: '',
    role: 'GUARDIAN',
    is_active: true
});

const emptyEditForm = (): EditFormState => ({
    id: '',
    email: '',
    full_name: '',
    user_type: 'guardian',
    professional_card_number: '',
    role: 'GUARDIAN',
    is_active: true
});

function mapUserTypeLabel(userType: User['user_type']) {
    return userType === 'psychologist' ? 'Psicologo' : 'Padre/Tutor';
}

function mapRoleLabel(role: string) {
    const normalized = role.trim().toUpperCase();
    if (normalized === 'ADMIN') return 'Administrador';
    if (normalized === 'PSYCHOLOGIST') return 'Psicologo';
    if (normalized === 'GUARDIAN') return 'Padre/Tutor';
    return normalized;
}

function getPrimaryRole(user: User) {
    if (user.roles.includes('ADMIN')) return 'ADMIN';
    if (user.roles.includes('PSYCHOLOGIST')) return 'PSYCHOLOGIST';
    if (user.roles.includes('GUARDIAN')) return 'GUARDIAN';
    return user.roles[0] ?? (user.user_type === 'psychologist' ? 'PSYCHOLOGIST' : 'GUARDIAN');
}

function validateUserForm(
    values: CreateFormState | EditFormState,
    options: { isCreate: boolean }
) {
    const errors: FormErrors = {};

    if (options.isCreate && 'username' in values && values.username.trim().length < 3) {
        errors.username = 'Ingresa un usuario valido.';
    }

    if ('email' in values && !values.email.trim()) {
        errors.email = 'El correo es obligatorio.';
    }

    if (options.isCreate && 'password' in values && values.password.trim().length < 8) {
        errors.password = 'La contrasena debe tener al menos 8 caracteres.';
    }

    if (!values.user_type) {
        errors.user_type = 'Selecciona un tipo de usuario.';
    }

    if (!values.role) {
        errors.role = 'Selecciona un rol.';
    }

    if (values.user_type === 'psychologist' && !values.professional_card_number.trim()) {
        errors.professional_card_number = 'La tarjeta profesional es obligatoria para psicologos.';
    }

    return errors;
}

function SearchIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10.5 4a6.5 6.5 0 0 1 5.131 10.49l3.439 3.44-1.06 1.06-3.44-3.439A6.5 6.5 0 1 1 10.5 4Zm0 1.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" />
        </svg>
    );
}

function PlusIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
        </svg>
    );
}

function EditIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m4 16.25 10.7-10.7 3.75 3.75L7.75 20H4v-3.75Zm2 1.75h.92l9.4-9.4-1.92-1.92L5 16.08V18Z" />
        </svg>
    );
}

function TrashIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Z" />
        </svg>
    );
}

function KeyIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 4a6 6 0 1 1-5.66 8H4v-2h5.17A6 6 0 0 1 14 4Zm0 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
        </svg>
    );
}

function ShieldIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3 5 6v5c0 4.25 2.72 8.21 7 10 4.28-1.79 7-5.75 7-10V6l-7-3Zm0 2.18 5 2.14V11c0 3.25-1.95 6.42-5 8-3.05-1.58-5-4.75-5-8V7.32l5-2.14Z" />
        </svg>
    );
}

function CopyIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 7V4h11v13h-3v3H5V7h3Zm2 0h6v8h1V6h-7v1Zm-3 2v9h7V9H7Z" />
        </svg>
    );
}

function EmptyIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 5h16v2H4V5Zm1 4h14v10H5V9Zm3 2v2h8v-2H8Zm0 4v2h5v-2H8Z" />
        </svg>
    );
}

function ArrowLeftIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6 9 12l6 6" />
        </svg>
    );
}

function ArrowRightIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
        </svg>
    );
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

    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
    const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);
    const [userToResetMfa, setUserToResetMfa] = useState<User | null>(null);

    const [createForm, setCreateForm] = useState<CreateFormState>(initialCreateForm);
    const [editForm, setEditForm] = useState<EditFormState>(emptyEditForm);
    const [formErrors, setFormErrors] = useState<FormErrors>({});

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const filteredItems = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();

        return items.filter((user) => {
            const matchesSearch =
                !query ||
                user.username.toLowerCase().includes(query) ||
                user.email.toLowerCase().includes(query) ||
                (user.full_name ?? '').toLowerCase().includes(query);

            const matchesRole =
                roleFilter === 'all' || user.roles.some((role) => role.toUpperCase() === roleFilter);

            const matchesType = typeFilter === 'all' || user.user_type === typeFilter;

            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' ? user.is_active : !user.is_active);

            return matchesSearch && matchesRole && matchesType && matchesStatus;
        });
    }, [items, roleFilter, searchTerm, statusFilter, typeFilter]);

    const resetCreateState = () => {
        setCreateForm(initialCreateForm());
        setFormErrors({});
    };

    const closeCreateModal = () => {
        setIsCreateOpen(false);
        resetCreateState();
    };

    const closeEditModal = () => {
        setEditingUserId(null);
        setEditForm(emptyEditForm());
        setFormErrors({});
    };

    const openCreateModal = () => {
        clearMessages();
        resetCreateState();
        setIsCreateOpen(true);
    };

    const openEditModal = async (userId: string) => {
        clearMessages();
        setFormErrors({});
        setEditingUserId(userId);
        const detail = await fetchUserDetail(userId);

        if (!detail) {
            setEditingUserId(null);
            return;
        }

        setEditForm({
            id: detail.id,
            email: detail.email,
            full_name: detail.full_name ?? '',
            user_type: detail.user_type,
            professional_card_number: detail.professional_card_number ?? '',
            role: getPrimaryRole(detail),
            is_active: detail.is_active
        });
    };

    const handleCopyId = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
        } catch {
            window.prompt('Copia el identificador', value);
        }
    };

    const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const errors = validateUserForm(createForm, { isCreate: true });
        setFormErrors(errors);

        if (Object.keys(errors).length > 0) {
            return;
        }

        const payload: CreateUserRequest = {
            username: createForm.username.trim(),
            email: createForm.email.trim(),
            password: createForm.password,
            full_name: createForm.full_name.trim() || undefined,
            user_type: createForm.user_type,
            professional_card_number:
                createForm.user_type === 'psychologist'
                    ? createForm.professional_card_number.trim()
                    : undefined,
            roles: [createForm.role],
            is_active: createForm.is_active
        };

        const success = await createUser(payload);
        if (success) {
            closeCreateModal();
        }
    };

    const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const errors = validateUserForm(editForm, { isCreate: false });
        setFormErrors(errors);

        if (Object.keys(errors).length > 0 || !editForm.id) {
            return;
        }

        const success = await updateUser(editForm.id, {
            user_type: editForm.user_type,
            roles: [editForm.role],
            is_active: editForm.is_active,
            professional_card_number:
                editForm.user_type === 'psychologist'
                    ? editForm.professional_card_number.trim()
                    : null
        });

        if (success) {
            closeEditModal();
        }
    };

    const confirmDeactivate = async () => {
        if (!userToDeactivate) return;
        const success = await deactivateUser(userToDeactivate.id);
        if (success) {
            setUserToDeactivate(null);
        }
    };

    const confirmPasswordReset = async () => {
        if (!userToResetPassword) return;
        const success = await resetUserPassword(userToResetPassword.id);
        if (success) {
            setUserToResetPassword(null);
        }
    };

    const confirmMfaReset = async () => {
        if (!userToResetMfa) return;
        const success = await resetUserMfa(userToResetMfa.id);
        if (success) {
            setUserToResetMfa(null);
        }
    };

    return (
        <section className="usuarios">
            <div className="usuarios-header">
                <div className="usuarios-title">
                    <h1>Usuarios</h1>
                    <p>Gestion de usuarios del sistema.</p>
                </div>

                <div className="usuarios-actions">
                    <button type="button" className="usuarios-btn primary usuarios-btn-create" onClick={openCreateModal}>
                        <span className="usuarios-btn-create-icon">
                            <PlusIcon />
                        </span>
                        Crear usuario
                    </button>
                </div>
            </div>

            <div className="usuarios-divider" />

            {error ? (
                <div className="usuarios-alert error">
                    <span>{error}</span>
                    <button type="button" className="usuarios-btn ghost" onClick={clearMessages}>
                        Cerrar
                    </button>
                </div>
            ) : null}

            {notice ? (
                <div className="usuarios-alert success">
                    <span>{notice}</span>
                    <button type="button" className="usuarios-btn ghost" onClick={clearMessages}>
                        Cerrar
                    </button>
                </div>
            ) : null}

            <div className="usuarios-controls">
                <div className="usuarios-search">
                    <span className="usuarios-search-icon">
                        <SearchIcon />
                    </span>
                    <input
                        type="search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Buscar por nombre, usuario o correo"
                        aria-label="Buscar usuarios"
                    />
                </div>

                <div className="usuarios-filters">
                    <label>
                        Rol
                        <CustomSelect
                            value={roleFilter}
                            options={roleFilterOptions}
                            onChange={setRoleFilter}
                            ariaLabel="Filtrar por rol"
                        />
                    </label>

                    <label>
                        Tipo
                        <CustomSelect
                            value={typeFilter}
                            options={typeFilterOptions}
                            onChange={setTypeFilter}
                            ariaLabel="Filtrar por tipo"
                        />
                    </label>

                    <label>
                        Estado
                        <CustomSelect
                            value={statusFilter}
                            options={statusOptions}
                            onChange={setStatusFilter}
                            ariaLabel="Filtrar por estado"
                        />
                    </label>
                </div>
            </div>

            <div className="usuarios-table">
                <div className="usuarios-table-head">
                    <div>Nombre</div>
                    <div>Usuario</div>
                    <div>Correo</div>
                    <div>Tipo</div>
                    <div>Rol</div>
                    <div>Estado</div>
                    <div>Acciones</div>
                </div>

                <div className="usuarios-table-body">
                    {loading ? (
                        <div className="usuarios-skeleton">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <div className="usuarios-skeleton-row" key={index}>
                                    {Array.from({ length: 7 }).map((__, columnIndex) => (
                                        <span key={columnIndex} />
                                    ))}
                                </div>
                            ))}
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="usuarios-empty">
                            <div className="usuarios-empty-icon">
                                <EmptyIcon />
                            </div>
                            <div>No hay usuarios para mostrar.</div>
                        </div>
                    ) : (
                        filteredItems.map((user) => (
                            <div className="usuarios-row" key={user.id}>
                                <div className="usuarios-cell">
                                    <div className="usuarios-name">{user.full_name || user.username}</div>
                                    <div className="usuarios-sub">{user.created_at ? 'Registrado' : 'Sin fecha registrada'}</div>
                                </div>

                                <div className="usuarios-cell id">
                                    <div className="usuarios-name">{user.username}</div>
                                    <div className="usuarios-id-wrap">
                                        <button
                                            type="button"
                                            className="icon-btn usuarios-id-copy has-tooltip"
                                            data-tooltip="Copiar ID"
                                            onClick={() => void handleCopyId(user.id)}
                                        >
                                            <CopyIcon />
                                        </button>
                                        <span className="usuarios-id-value" title={user.id}>
                                            {user.id}
                                        </span>
                                    </div>
                                </div>

                                <div className="usuarios-cell">
                                    <div>{user.email}</div>
                                </div>

                                <div className="usuarios-cell">
                                    <div className="usuarios-type">{mapUserTypeLabel(user.user_type)}</div>
                                    {user.user_type === 'psychologist' && user.professional_card_number ? (
                                        <div className="usuarios-sub">{user.professional_card_number}</div>
                                    ) : null}
                                </div>

                                <div className="usuarios-cell">
                                    {user.roles.length > 0 ? user.roles.map(mapRoleLabel).join(', ') : '-'}
                                </div>

                                <div className="usuarios-cell status">
                                    <span className={`status-dot ${user.is_active ? 'active' : 'inactive'}`} />
                                    <span>{user.is_active ? 'Activo' : 'Inactivo'}</span>
                                </div>

                                <div className="usuarios-cell actions">
                                    <button
                                        type="button"
                                        className="icon-btn has-tooltip"
                                        data-tooltip="Editar"
                                        onClick={() => void openEditModal(user.id)}
                                    >
                                        <EditIcon />
                                    </button>
                                    <button
                                        type="button"
                                        className="icon-btn has-tooltip"
                                        data-tooltip="Restablecer contrasena"
                                        onClick={() => setUserToResetPassword(user)}
                                    >
                                        <KeyIcon />
                                    </button>
                                    <button
                                        type="button"
                                        className="icon-btn has-tooltip"
                                        data-tooltip="Resetear MFA"
                                        onClick={() => setUserToResetMfa(user)}
                                    >
                                        <ShieldIcon />
                                    </button>
                                    <button
                                        type="button"
                                        className="icon-btn has-tooltip"
                                        data-tooltip="Desactivar"
                                        onClick={() => setUserToDeactivate(user)}
                                        disabled={!user.is_active}
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="usuarios-pagination">
                <div>
                    Mostrando {filteredItems.length} de {total} registros.
                </div>

                <div className="usuarios-pagination-controls">
                    <div className="usuarios-page-size">
                        <label>
                            Filas
                            <CustomSelect
                                value={String(pageSize)}
                                options={pageSizeOptions}
                                onChange={(value) => void changePageSize(Number(value))}
                                ariaLabel="Cambiar tamano de pagina"
                            />
                        </label>
                    </div>

                    <button
                        type="button"
                        className="usuarios-btn ghost usuarios-page-nav-btn"
                        onClick={() => void goToPage(Math.max(1, page - 1))}
                        disabled={page <= 1 || loading}
                        aria-label="Pagina anterior"
                    >
                        <ArrowLeftIcon />
                    </button>

                    <span className="usuarios-page">
                        Pagina {page} de {totalPages}
                    </span>

                    <button
                        type="button"
                        className="usuarios-btn ghost usuarios-page-nav-btn"
                        onClick={() => void goToPage(Math.min(totalPages, page + 1))}
                        disabled={page >= totalPages || loading}
                        aria-label="Pagina siguiente"
                    >
                        <ArrowRightIcon />
                    </button>
                </div>
            </div>

            <Modal isOpen={isCreateOpen} onClose={closeCreateModal}>
                <form className="usuarios-modal" onSubmit={handleCreateSubmit}>
                    <h2>Crear usuario</h2>

                    <label>
                        Usuario
                        <input
                            type="text"
                            value={createForm.username}
                            onChange={(event) => setCreateForm((prev) => ({ ...prev, username: event.target.value }))}
                        />
                        {formErrors.username ? <span className="usuarios-sub">{formErrors.username}</span> : null}
                    </label>

                    <label>
                        Correo
                        <input
                            type="email"
                            value={createForm.email}
                            onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
                        />
                        {formErrors.email ? <span className="usuarios-sub">{formErrors.email}</span> : null}
                    </label>

                    <label>
                        Contrasena
                        <input
                            type="password"
                            value={createForm.password}
                            onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
                        />
                        {formErrors.password ? <span className="usuarios-sub">{formErrors.password}</span> : null}
                    </label>

                    <label>
                        Nombre completo
                        <input
                            type="text"
                            value={createForm.full_name}
                            onChange={(event) => setCreateForm((prev) => ({ ...prev, full_name: event.target.value }))}
                        />
                    </label>

                    <label>
                        Tipo de usuario
                        <CustomSelect
                            value={createForm.user_type}
                            options={typeOptions}
                            onChange={(value) =>
                                setCreateForm((prev) => ({
                                    ...prev,
                                    user_type: value as CreateFormState['user_type'],
                                    role: value === 'psychologist' && prev.role === 'GUARDIAN' ? 'PSYCHOLOGIST' : prev.role,
                                    professional_card_number:
                                        value === 'psychologist' ? prev.professional_card_number : ''
                                }))
                            }
                            ariaLabel="Seleccionar tipo de usuario"
                        />
                        {formErrors.user_type ? <span className="usuarios-sub">{formErrors.user_type}</span> : null}
                    </label>

                    <label>
                        Rol
                        <CustomSelect
                            value={createForm.role}
                            options={roleOptions}
                            onChange={(value) => setCreateForm((prev) => ({ ...prev, role: value }))}
                            ariaLabel="Seleccionar rol"
                        />
                        {formErrors.role ? <span className="usuarios-sub">{formErrors.role}</span> : null}
                    </label>

                    {createForm.user_type === 'psychologist' ? (
                        <label>
                            Tarjeta profesional
                            <input
                                type="text"
                                value={createForm.professional_card_number}
                                onChange={(event) =>
                                    setCreateForm((prev) => ({
                                        ...prev,
                                        professional_card_number: event.target.value
                                    }))
                                }
                            />
                            {formErrors.professional_card_number ? (
                                <span className="usuarios-sub">{formErrors.professional_card_number}</span>
                            ) : null}
                        </label>
                    ) : null}

                    <label className="usuarios-switch">
                        <input
                            type="checkbox"
                            checked={createForm.is_active}
                            onChange={(event) =>
                                setCreateForm((prev) => ({ ...prev, is_active: event.target.checked }))
                            }
                        />
                        Usuario activo
                    </label>

                    <div className="usuarios-modal-actions">
                        <button type="button" className="usuarios-btn secondary" onClick={closeCreateModal}>
                            Cancelar
                        </button>
                        <button type="submit" className="usuarios-btn primary" disabled={submittingCreate}>
                            {submittingCreate ? 'Guardando...' : 'Crear'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={Boolean(editingUserId)} onClose={closeEditModal}>
                <form className="usuarios-modal" onSubmit={handleEditSubmit}>
                    <h2>Editar usuario</h2>

                    {loadingDetail ? (
                        <div className="usuarios-modal-loading">Cargando detalle...</div>
                    ) : (
                        <>
                            <label>
                                Correo
                                <input type="email" value={editForm.email} readOnly disabled />
                            </label>

                            <label>
                                Nombre completo
                                <input type="text" value={editForm.full_name} readOnly disabled />
                            </label>

                            <label>
                                Tipo de usuario
                                <CustomSelect
                                    value={editForm.user_type}
                                    options={typeOptions}
                                    onChange={(value) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            user_type: value as EditFormState['user_type'],
                                            role:
                                                value === 'psychologist' && prev.role === 'GUARDIAN'
                                                    ? 'PSYCHOLOGIST'
                                                    : prev.role,
                                            professional_card_number:
                                                value === 'psychologist' ? prev.professional_card_number : ''
                                        }))
                                    }
                                    ariaLabel="Seleccionar tipo de usuario para edicion"
                                />
                                {formErrors.user_type ? (
                                    <span className="usuarios-sub">{formErrors.user_type}</span>
                                ) : null}
                            </label>

                            <label>
                                Rol
                                <CustomSelect
                                    value={editForm.role}
                                    options={roleOptions}
                                    onChange={(value) => setEditForm((prev) => ({ ...prev, role: value }))}
                                    ariaLabel="Seleccionar rol para edicion"
                                />
                                {formErrors.role ? <span className="usuarios-sub">{formErrors.role}</span> : null}
                            </label>

                            {editForm.user_type === 'psychologist' ? (
                                <label>
                                    Tarjeta profesional
                                    <input
                                        type="text"
                                        value={editForm.professional_card_number}
                                        onChange={(event) =>
                                            setEditForm((prev) => ({
                                                ...prev,
                                                professional_card_number: event.target.value
                                            }))
                                        }
                                    />
                                    {formErrors.professional_card_number ? (
                                        <span className="usuarios-sub">{formErrors.professional_card_number}</span>
                                    ) : null}
                                </label>
                            ) : null}

                            <label className="usuarios-switch">
                                <input
                                    type="checkbox"
                                    checked={editForm.is_active}
                                    onChange={(event) =>
                                        setEditForm((prev) => ({ ...prev, is_active: event.target.checked }))
                                    }
                                />
                                Usuario activo
                            </label>
                        </>
                    )}

                    <div className="usuarios-modal-actions">
                        <button type="button" className="usuarios-btn secondary" onClick={closeEditModal}>
                            Cancelar
                        </button>
                        <button type="submit" className="usuarios-btn primary" disabled={submittingUpdate || loadingDetail}>
                            {submittingUpdate ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={Boolean(userToDeactivate)} onClose={() => setUserToDeactivate(null)}>
                <div className="usuarios-modal">
                    <h2>Desactivar usuario</h2>
                    <p>
                        {userToDeactivate
                            ? `Se desactivara a ${userToDeactivate.full_name || userToDeactivate.username}.`
                            : ''}
                    </p>
                    <div className="usuarios-modal-actions">
                        <button
                            type="button"
                            className="usuarios-btn secondary"
                            onClick={() => setUserToDeactivate(null)}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="usuarios-btn primary"
                            onClick={() => void confirmDeactivate()}
                            disabled={submittingDeactivate}
                        >
                            {submittingDeactivate ? 'Procesando...' : 'Confirmar'}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={Boolean(userToResetPassword)} onClose={() => setUserToResetPassword(null)}>
                <div className="usuarios-modal">
                    <h2>Restablecer contrasena</h2>
                    <p>
                        {userToResetPassword
                            ? `Se enviara el restablecimiento a ${userToResetPassword.email}.`
                            : ''}
                    </p>
                    <div className="usuarios-modal-actions">
                        <button
                            type="button"
                            className="usuarios-btn secondary"
                            onClick={() => setUserToResetPassword(null)}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="usuarios-btn primary"
                            onClick={() => void confirmPasswordReset()}
                            disabled={submittingPasswordReset}
                        >
                            {submittingPasswordReset ? 'Procesando...' : 'Confirmar'}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={Boolean(userToResetMfa)} onClose={() => setUserToResetMfa(null)}>
                <div className="usuarios-modal">
                    <h2>Resetear MFA</h2>
                    <p>
                        {userToResetMfa
                            ? `Se restablecera MFA para ${userToResetMfa.full_name || userToResetMfa.username}.`
                            : ''}
                    </p>
                    <div className="usuarios-modal-actions">
                        <button
                            type="button"
                            className="usuarios-btn secondary"
                            onClick={() => setUserToResetMfa(null)}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="usuarios-btn primary"
                            onClick={() => void confirmMfaReset()}
                            disabled={submittingMfaReset}
                        >
                            {submittingMfaReset ? 'Procesando...' : 'Confirmar'}
                        </button>
                    </div>
                </div>
            </Modal>
        </section>
    );
}
