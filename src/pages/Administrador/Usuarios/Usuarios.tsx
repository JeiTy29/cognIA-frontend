import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { Modal } from '../../../components/Modal/Modal';
import { CustomSelect, type CustomSelectOption } from '../../../components/CustomSelect/CustomSelect';
import { useUsers } from '../../../hooks/useUsers';
import { fetchUsersForReport } from '../../../services/admin/adminReportData';
import type { CreateUserRequest, User } from '../../../services/admin/users';
import { downloadUsersReportPdf } from '../../../utils/reports/admin/usersReport';
import '../AdminShared.css';
import './Usuarios.css';

type ManagedUserType = 'guardian' | 'psychologist';

type EditFormState = {
    id: string;
    user_type: ManagedUserType;
    professional_card_number: string;
    is_active: boolean;
};

type CreateFormState = {
    username: string;
    email: string;
    password: string;
    full_name: string;
    user_type: ManagedUserType;
    professional_card_number: string;
};

type UsersReportLimit = '10' | '20' | '50' | '100' | 'all';
type UsersReportOrder = 'recent' | 'oldest' | 'username' | 'email';
type UsersReportModalState = {
    limit: UsersReportLimit;
    order: UsersReportOrder;
    role: 'all' | 'ADMIN' | 'GUARDIAN' | 'PSYCHOLOGIST';
    status: 'all' | 'active' | 'inactive';
    includeGrowthSummary: boolean;
    includeDetailedTable: boolean;
};

type FormErrors = Partial<Record<keyof EditFormState | keyof CreateFormState, string>>;
type UserConfirmationKind = 'deactivate' | 'reactivate' | 'password-reset' | 'mfa-reset';
type UserActionButtonProps = Readonly<{
    tooltip: string;
    ariaLabel?: string;
    onClick: () => void;
    children: ReactNode;
}>;
type UserConfirmationModalProps = Readonly<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    loadingLabel: string;
    isSubmitting: boolean;
    onClose: () => void;
    onConfirm: () => void;
}>;

const USER_ROLE_BY_TYPE: Record<ManagedUserType, string> = {
    guardian: 'GUARDIAN',
    psychologist: 'PSYCHOLOGIST'
};

const editableUserTypeOptions: CustomSelectOption[] = [
    { value: 'guardian', label: 'Padre/Tutor' },
    { value: 'psychologist', label: 'Psicólogo' }
];

const createUserTypeOptions: CustomSelectOption[] = [
    { value: 'guardian', label: 'Padre/Tutor' },
    { value: 'psychologist', label: 'Psicólogo' }
];

const roleFilterOptions: CustomSelectOption[] = [
    { value: 'all', label: 'Todos los roles' },
    { value: 'GUARDIAN', label: 'Padre/Tutor' },
    { value: 'PSYCHOLOGIST', label: 'Psicólogo' },
    { value: 'ADMIN', label: 'Administrador' }
];

const statusOptions: CustomSelectOption[] = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' }
];

const pageSizeOptions: CustomSelectOption[] = [
    { value: '10', label: '10 por página' },
    { value: '20', label: '20 por página' },
    { value: '50', label: '50 por página' }
];

const usersReportLimitOptions: CustomSelectOption[] = [
    { value: '10', label: '10' },
    { value: '20', label: '20' },
    { value: '50', label: '50' },
    { value: '100', label: '100' },
    { value: 'all', label: 'Todos' }
];

const usersReportOrderOptions: CustomSelectOption[] = [
    { value: 'recent', label: 'MÃ¡s recientes primero' },
    { value: 'oldest', label: 'MÃ¡s antiguos primero' },
    { value: 'username', label: 'Nombre de usuario A-Z' },
    { value: 'email', label: 'Correo A-Z' }
];

const emptyEditForm = (): EditFormState => ({
    id: '',
    user_type: 'guardian',
    professional_card_number: '',
    is_active: true
});

const emptyCreateForm = (): CreateFormState => ({
    username: '',
    email: '',
    password: '',
    full_name: '',
    user_type: 'guardian',
    professional_card_number: ''
});

const defaultUsersReportModal = (): UsersReportModalState => ({
    limit: '20',
    order: 'recent',
    role: 'all',
    status: 'all',
    includeGrowthSummary: true,
    includeDetailedTable: true
});

function getUsersReportOrderLabel(value: UsersReportOrder) {
    if (value === 'oldest') return 'MÃ¡s antiguos primero';
    if (value === 'username') return 'Nombre de usuario A-Z';
    if (value === 'email') return 'Correo A-Z';
    return 'MÃ¡s recientes primero';
}

function getUsersReportRoleLabel(value: UsersReportModalState['role']) {
    if (value === 'ADMIN') return 'Administrador';
    if (value === 'GUARDIAN') return 'Padre o tutor';
    if (value === 'PSYCHOLOGIST') return 'PsicÃ³logo';
    return 'Todos';
}

function getUsersReportStatusLabel(value: UsersReportModalState['status']) {
    if (value === 'active') return 'Activos';
    if (value === 'inactive') return 'Inactivos';
    return 'Todos';
}

function runUserTask(task: () => Promise<void>) {
    task().catch(() => undefined);
}

function deriveRoles(userType: ManagedUserType) {
    return [USER_ROLE_BY_TYPE[userType]];
}

function normalizeEditableUserType(user: User): ManagedUserType {
    const normalized = String(user.user_type).trim().toLowerCase();
    if (normalized === 'psychologist') return 'psychologist';
    return 'guardian';
}

function hasAdminRole(user: User) {
    return user.roles.some((role) => role.trim().toUpperCase() === 'ADMIN');
}

function mapRoleLabel(role: string) {
    const normalized = role.trim().toUpperCase();
    if (normalized === 'ADMIN') return 'Administrador';
    if (normalized === 'PSYCHOLOGIST') return 'Psicólogo';
    if (normalized === 'GUARDIAN') return 'Padre/Tutor';
    if (normalized === 'TEACHER') return 'Docente (legacy)';
    return 'No contemplado';
}

function getVisibleRoles(user: User) {
    if (user.roles.length === 0) {
        return ['Sin rol asignado'];
    }
    return user.roles.map(mapRoleLabel);
}

function validateEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validateEditForm(values: EditFormState) {
    const errors: FormErrors = {};

    if (!values.user_type) {
        errors.user_type = 'Selecciona un tipo de usuario.';
    }

    if (values.user_type === 'psychologist' && !values.professional_card_number.trim()) {
        errors.professional_card_number = 'La tarjeta profesional es obligatoria para psicólogos.';
    }

    return errors;
}

function validateCreateForm(values: CreateFormState) {
    const errors: FormErrors = {};

    if (!values.username.trim()) {
        errors.username = 'El usuario es obligatorio.';
    }

    if (!values.email.trim()) {
        errors.email = 'El correo es obligatorio.';
    } else if (!validateEmail(values.email)) {
        errors.email = 'Ingresa un correo válido.';
    }

    if (!values.password.trim()) {
        errors.password = 'La contraseña es obligatoria.';
    } else if (values.password.trim().length < 8) {
        errors.password = 'La contraseña debe tener al menos 8 caracteres.';
    }

    if (!values.user_type) {
        errors.user_type = 'Selecciona un tipo de usuario.';
    }

    if (values.user_type === 'psychologist') {
        if (!values.full_name.trim()) {
            errors.full_name = 'El nombre completo es obligatorio para psicólogos.';
        }
        if (!values.professional_card_number.trim()) {
            errors.professional_card_number = 'La tarjeta profesional es obligatoria para psicólogos.';
        }
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
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
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

function LockUserIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2a5 5 0 0 1 5 5v2h1a2 2 0 0 1 2 2v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-7a2 2 0 0 1 2-2h1V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v2h6V7a3 3 0 0 0-3-3Zm-4 7h8v7a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-7Z" />
        </svg>
    );
}

function UnlockUserIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2a5 5 0 0 1 5 5h-2a3 3 0 0 0-6 0v2h7a2 2 0 0 1 2 2v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-7a2 2 0 0 1 2-2h1V7a5 5 0 0 1 5-5Zm-4 9v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-7H8Z" />
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

function UserActionButton({
    tooltip,
    ariaLabel,
    onClick,
    children
}: UserActionButtonProps) {
    return (
        <button
            type="button"
            className="icon-btn has-tooltip"
            data-tooltip={tooltip}
            aria-label={ariaLabel}
            onClick={onClick}
        >
            {children}
        </button>
    );
}

function buildConfirmationMessage(user: User | null, kind: UserConfirmationKind) {
    if (!user) return '';
    if (kind === 'deactivate') {
        return `Se desactivará a ${user.full_name || user.username}.`;
    }
    if (kind === 'reactivate') {
        const note =
            String(user.user_type).trim().toLowerCase() === 'psychologist' && user.colpsic_verified === false
                ? ' Si es psicólogo, también debe estar aprobado para poder iniciar sesión.'
                : '';
        return `Se reactivará a ${user.full_name || user.username}. Podrá volver a iniciar sesión si cumple los demás requisitos de acceso.${note}`;
    }
    if (kind === 'password-reset') {
        return `Se enviará el restablecimiento a ${user.email}.`;
    }
    return `Se restablecerá MFA para ${user.full_name || user.username}.`;
}

function UserConfirmationModal({
    isOpen,
    title,
    description,
    confirmLabel,
    loadingLabel,
    isSubmitting,
    onClose,
    onConfirm
}: UserConfirmationModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="usuarios-modal">
                <h2>{title}</h2>
                <p>{description}</p>
                <div className="usuarios-modal-actions">
                    <button type="button" className="usuarios-btn secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className="usuarios-btn primary"
                        onClick={onConfirm}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? loadingLabel : confirmLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export default function Usuarios() {
    const {
        items,
        page,
        pageSize,
        total,
        visibleCount,
        filters,
        loading,
        error,
        notice,
        submittingCreate,
        submittingUpdate,
        submittingDeactivate,
        submittingReactivate,
        submittingPasswordReset,
        submittingMfaReset,
        goToPage,
        changePageSize,
        setSearchQuery,
        setRoleFilter,
        setStatusFilter,
        createUser,
        updateUser,
        deactivateUser,
        reactivateUser,
        resetUserPassword,
        resetUserMfa,
        clearMessages
    } = useUsers();

    const [searchDraft, setSearchDraft] = useState(filters.q);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [creatingUser, setCreatingUser] = useState(false);
    const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
    const [userToReactivate, setUserToReactivate] = useState<User | null>(null);
    const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);
    const [userToResetMfa, setUserToResetMfa] = useState<User | null>(null);
    const [editForm, setEditForm] = useState<EditFormState>(emptyEditForm);
    const [createForm, setCreateForm] = useState<CreateFormState>(emptyCreateForm);
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [createModalError, setCreateModalError] = useState<string | null>(null);
    const [reportWorking, setReportWorking] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [reportNotice, setReportNotice] = useState<string | null>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportForm, setReportForm] = useState<UsersReportModalState>(defaultUsersReportModal);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const handleDownloadReport = async () => {
        setReportWorking(true);
        setReportError(null);
        setCreateModalError(null);
        setReportNotice(null);
        try {
            const result = await fetchUsersForReport({
                limit: reportForm.limit === 'all' ? 'all' : Number(reportForm.limit),
                role: reportForm.role === 'all' ? undefined : reportForm.role,
                isActive:
                    reportForm.status === 'all'
                        ? undefined
                        : reportForm.status === 'active',
                orderBy: reportForm.order
            });

            await downloadUsersReportPdf({
                items: result.items,
                totalIncluded: result.items.length,
                totalAvailable: result.totalAvailable,
                truncated: result.truncated,
                filters: [
                    `Cantidad: ${reportForm.limit === 'all' ? 'Todos' : reportForm.limit}`,
                    `Orden: ${getUsersReportOrderLabel(reportForm.order)}`,
                    `Rol: ${getUsersReportRoleLabel(reportForm.role)}`,
                    `Estado: ${getUsersReportStatusLabel(reportForm.status)}`
                ],
                options: {
                    includeGrowthSummary: reportForm.includeGrowthSummary,
                    includeDetailedTable: reportForm.includeDetailedTable,
                    limitLabel: reportForm.limit === 'all' ? 'Todos' : reportForm.limit,
                    orderLabel: getUsersReportOrderLabel(reportForm.order)
                }
            });
            setIsReportModalOpen(false);
            setReportNotice('Reporte descargado correctamente.');
        } catch {
            setReportError('No se pudo generar el reporte. Intenta nuevamente.');
        } finally {
            setReportWorking(false);
        }
    };

    useEffect(() => {
        const timeoutId = globalThis.setTimeout(() => {
            setSearchQuery(searchDraft);
        }, 300);

        return () => {
            globalThis.clearTimeout(timeoutId);
        };
    }, [searchDraft, setSearchQuery]);

    const createPayload = useMemo<CreateUserRequest>(() => ({
        username: createForm.username.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        full_name: createForm.user_type === 'psychologist' ? createForm.full_name.trim() || null : null,
        user_type: createForm.user_type,
        roles: deriveRoles(createForm.user_type),
        professional_card_number:
            createForm.user_type === 'psychologist'
                ? createForm.professional_card_number.trim() || null
                : null
    }), [createForm]);

    const closeEditModal = () => {
        setEditingUser(null);
        setEditForm(emptyEditForm());
        setFormErrors({});
    };

    const closeCreateModal = () => {
        setCreatingUser(false);
        setCreateForm(emptyCreateForm());
        setFormErrors({});
        setCreateModalError(null);
    };

    const openEditModal = (user: User) => {
        clearMessages();
        setFormErrors({});
        setEditingUser(user);
        setEditForm({
            id: user.id,
            user_type: normalizeEditableUserType(user),
            professional_card_number: user.professional_card_number ?? '',
            is_active: user.is_active
        });
    };

    const handleCopyId = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
        } catch {
            globalThis.prompt('Copia el identificador', value);
        }
    };

    const handleCopyIdAction = (value: string) => {
        runUserTask(() => handleCopyId(value));
    };

    const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const errors = validateEditForm(editForm);
        setFormErrors(errors);

        if (Object.keys(errors).length > 0 || !editForm.id || !editingUser) {
            return;
        }

        const payload =
            hasAdminRole(editingUser)
                ? { is_active: editForm.is_active }
                : {
                      user_type: editForm.user_type,
                      roles: deriveRoles(editForm.user_type),
                      is_active: editForm.is_active,
                      professional_card_number:
                          editForm.user_type === 'psychologist'
                              ? editForm.professional_card_number.trim()
                              : null
                  };

        const success = await updateUser(editForm.id, payload);

        if (success) {
            closeEditModal();
        }
    };

    const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const errors = validateCreateForm(createForm);
        setFormErrors(errors);
        setCreateModalError(null);

        if (Object.keys(errors).length > 0) {
            return;
        }

        const result = await createUser(createPayload);
        if (result.success) {
            closeCreateModal();
            return;
        }

        setCreateModalError(result.error ?? 'No se pudo crear el usuario.');
    };

    const confirmDeactivate = async () => {
        if (!userToDeactivate) return;
        const success = await deactivateUser(userToDeactivate.id);
        if (success) {
            setUserToDeactivate(null);
        }
    };

    const confirmReactivate = async () => {
        if (!userToReactivate) return;
        const success = await reactivateUser(userToReactivate.id);
        if (success) {
            setUserToReactivate(null);
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

    const renderUserActions = (user: User) => (
        <div className="usuarios-cell actions">
            <UserActionButton tooltip="Editar" onClick={() => openEditModal(user)}>
                <EditIcon />
            </UserActionButton>
            <UserActionButton tooltip="Restablecer contraseña" onClick={() => setUserToResetPassword(user)}>
                <KeyIcon />
            </UserActionButton>
            <UserActionButton tooltip="Resetear MFA" onClick={() => setUserToResetMfa(user)}>
                <ShieldIcon />
            </UserActionButton>
            {user.is_active ? (
                <UserActionButton
                    tooltip="Desactivar"
                    ariaLabel="Desactivar usuario"
                    onClick={() => setUserToDeactivate(user)}
                >
                    <LockUserIcon />
                </UserActionButton>
            ) : (
                <UserActionButton
                    tooltip="Reactivar"
                    ariaLabel="Reactivar usuario"
                    onClick={() => setUserToReactivate(user)}
                >
                    <UnlockUserIcon />
                </UserActionButton>
            )}
        </div>
    );

    const renderUsersTableContent = () => {
        if (loading) {
            return (
                <div className="usuarios-skeleton">
                    {Array.from({ length: 6 }, (_, rowIndex) => (
                        <div className="usuarios-skeleton-row" key={`skeleton-row-${rowIndex + 1}`}>
                            {Array.from({ length: 6 }, (_, columnIndex) => (
                                <span key={`skeleton-cell-${rowIndex + 1}-${columnIndex + 1}`} />
                            ))}
                        </div>
                    ))}
                </div>
            );
        }

        if (items.length === 0) {
            return (
                <div className="usuarios-empty">
                    <div className="usuarios-empty-icon">
                        <EmptyIcon />
                    </div>
                    <div>No hay usuarios para mostrar.</div>
                </div>
            );
        }

        return items.map((user) => {
            const visibleRoles = getVisibleRoles(user);

            return (
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
                                onClick={() => handleCopyIdAction(user.id)}
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
                        <div className="usuarios-profile-main">{visibleRoles.join(', ')}</div>
                        {user.roles.length === 0 ? <div className="usuarios-sub">Sin rol asignado</div> : null}
                        {visibleRoles.includes('Psicólogo') && user.professional_card_number ? (
                            <div className="usuarios-sub">Tarjeta: {user.professional_card_number}</div>
                        ) : null}
                    </div>

                    <div className="usuarios-cell status">
                        <span className={`status-dot ${user.is_active ? 'active' : 'inactive'}`} />
                        <span>{user.is_active ? 'Activo' : 'Inactivo'}</span>
                    </div>

                    {renderUserActions(user)}
                </div>
            );
        });
    };

    return (
        <section className="usuarios">
            <div className="usuarios-header">
                <div className="usuarios-title">
                    <h1>Usuarios</h1>
                    <p>Gestión de usuarios del sistema.</p>
                </div>

                <div className="usuarios-actions">
                    <button
                        type="button"
                        className="usuarios-btn ghost"
                        onClick={() => setIsReportModalOpen(true)}
                        disabled={reportWorking || loading}
                    >
                        {reportWorking ? 'Generando reporte...' : 'Descargar reporte'}
                    </button>
                    <button
                        type="button"
                        className="usuarios-btn primary usuarios-btn-create"
                        onClick={() => {
                            clearMessages();
                            setFormErrors({});
                            setCreateModalError(null);
                            setCreatingUser(true);
                        }}
                    >
                        <span className="usuarios-btn-create-icon" aria-hidden="true">
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
            {reportNotice ? (
                <div className="usuarios-alert success">
                    <span>{reportNotice}</span>
                    <button type="button" className="usuarios-btn ghost" onClick={() => setReportNotice(null)}>
                        Cerrar
                    </button>
                </div>
            ) : null}
            {reportError ? (
                <div className="usuarios-alert error">
                    <span>{reportError}</span>
                    <button type="button" className="usuarios-btn ghost" onClick={() => setReportError(null)}>
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
                        value={searchDraft}
                        onChange={(event) => setSearchDraft(event.target.value)}
                        placeholder="Buscar por usuario o correo"
                        aria-label="Buscar usuarios"
                    />
                </div>

                <div className="usuarios-filters">
                    <label>
                        Rol
                        <CustomSelect
                            value={filters.role}
                            options={roleFilterOptions}
                            onChange={setRoleFilter}
                            ariaLabel="Filtrar por rol"
                        />
                    </label>

                    <label>
                        Estado
                        <CustomSelect
                            value={filters.is_active}
                            options={statusOptions}
                            onChange={(value) => setStatusFilter(value as 'all' | 'active' | 'inactive')}
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
                    <div>Rol</div>
                    <div>Estado</div>
                    <div>Acciones</div>
                </div>

                <div className="usuarios-table-body">{renderUsersTableContent()}</div>
            </div>

            <div className="usuarios-pagination">
                <div>
                    Mostrando {visibleCount} de {total} registros.
                </div>

                <div className="usuarios-pagination-controls">
                    <div className="usuarios-page-size">
                        <label>
                            Tamaño
                            <CustomSelect
                                value={String(pageSize)}
                                options={pageSizeOptions}
                                onChange={(value) => {
                                    void changePageSize(Number(value));
                                }}
                                ariaLabel="Cambiar tamaño de página"
                            />
                        </label>
                    </div>

                    <button
                        type="button"
                        className="usuarios-btn ghost usuarios-page-nav-btn"
                        onClick={() => {
                            void goToPage(Math.max(1, page - 1));
                        }}
                        disabled={page <= 1 || loading}
                        aria-label="Página anterior"
                    >
                        <span className="usuarios-page-arrow" aria-hidden="true">‹</span>
                    </button>

                    <span className="usuarios-page">
                        Página {page} de {totalPages}
                    </span>

                    <button
                        type="button"
                        className="usuarios-btn ghost usuarios-page-nav-btn"
                        onClick={() => {
                            void goToPage(Math.min(totalPages, page + 1));
                        }}
                        disabled={page >= totalPages || loading}
                        aria-label="Página siguiente"
                    >
                        <span className="usuarios-page-arrow" aria-hidden="true">›</span>
                    </button>
                </div>
            </div>

            <Modal
                isOpen={isReportModalOpen}
                onClose={() => {
                    if (reportWorking) return;
                    setIsReportModalOpen(false);
                }}
            >
                <div className="admin-report-modal">
                    <h2>Configurar reporte de usuarios</h2>
                    <p>
                        Configura la cantidad, el orden y los filtros del reporte sin modificar la tabla visible del frontend.
                    </p>

                    <div className="admin-report-grid">
                        <label>
                            <span>Cantidad de usuarios</span>
                            <CustomSelect
                                value={reportForm.limit}
                                options={usersReportLimitOptions}
                                onChange={(value) =>
                                    setReportForm((prev) => ({ ...prev, limit: value as UsersReportLimit }))
                                }
                                ariaLabel="Cantidad de usuarios para el reporte"
                            />
                        </label>

                        <label>
                            <span>Orden</span>
                            <CustomSelect
                                value={reportForm.order}
                                options={usersReportOrderOptions}
                                onChange={(value) =>
                                    setReportForm((prev) => ({ ...prev, order: value as UsersReportOrder }))
                                }
                                ariaLabel="Orden de usuarios para el reporte"
                            />
                        </label>

                        <label>
                            <span>Rol</span>
                            <CustomSelect
                                value={reportForm.role}
                                options={roleFilterOptions}
                                onChange={(value) =>
                                    setReportForm((prev) => ({ ...prev, role: value as UsersReportModalState['role'] }))
                                }
                                ariaLabel="Rol para el reporte"
                            />
                        </label>

                        <label>
                            <span>Estado</span>
                            <CustomSelect
                                value={reportForm.status}
                                options={statusOptions}
                                onChange={(value) =>
                                    setReportForm((prev) => ({ ...prev, status: value as UsersReportModalState['status'] }))
                                }
                                ariaLabel="Estado para el reporte"
                            />
                        </label>
                    </div>

                    <div className="admin-report-checkbox">
                        <input
                            id="users-report-growth"
                            type="checkbox"
                            checked={reportForm.includeGrowthSummary}
                            onChange={(event) =>
                                setReportForm((prev) => ({ ...prev, includeGrowthSummary: event.target.checked }))
                            }
                        />
                        <label htmlFor="users-report-growth">
                            <strong>Incluir resumen de crecimiento</strong>
                            <span>Usa datos agregados de dashboard solo dentro del PDF.</span>
                        </label>
                    </div>

                    <div className="admin-report-checkbox">
                        <input
                            id="users-report-table"
                            type="checkbox"
                            checked={reportForm.includeDetailedTable}
                            onChange={(event) =>
                                setReportForm((prev) => ({ ...prev, includeDetailedTable: event.target.checked }))
                            }
                        />
                        <label htmlFor="users-report-table">
                            <strong>Incluir tabla detallada</strong>
                            <span>Agrega usuario, correo, rol, estado y fecha de creación.</span>
                        </label>
                    </div>

                    <div className="admin-report-actions">
                        <button
                            type="button"
                            className="usuarios-btn secondary"
                            onClick={() => setIsReportModalOpen(false)}
                            disabled={reportWorking}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="usuarios-btn primary"
                            onClick={() => {
                                handleDownloadReport().catch(() => undefined);
                            }}
                            disabled={reportWorking}
                        >
                            {reportWorking ? 'Generando PDF...' : 'Generar PDF'}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={creatingUser} onClose={closeCreateModal}>
                <form className="usuarios-modal" onSubmit={handleCreateSubmit}>
                    <h2>Crear usuario</h2>

                    {createModalError ? (
                        <div className="usuarios-alert error usuarios-modal-alert">
                            <span>{createModalError}</span>
                        </div>
                    ) : null}

                    <label>
                        <span>Usuario</span>
                        <input
                            type="text"
                            value={createForm.username}
                            onChange={(event) =>
                                setCreateForm((prev) => ({ ...prev, username: event.target.value }))
                            }
                        />
                        {formErrors.username ? <span className="usuarios-sub">{formErrors.username}</span> : null}
                    </label>

                    <label>
                        <span>Correo</span>
                        <input
                            type="email"
                            value={createForm.email}
                            onChange={(event) =>
                                setCreateForm((prev) => ({ ...prev, email: event.target.value }))
                            }
                        />
                        {formErrors.email ? <span className="usuarios-sub">{formErrors.email}</span> : null}
                    </label>

                    <label>
                        <span>Contraseña</span>
                        <input
                            type="password"
                            value={createForm.password}
                            onChange={(event) =>
                                setCreateForm((prev) => ({ ...prev, password: event.target.value }))
                            }
                        />
                        {formErrors.password ? <span className="usuarios-sub">{formErrors.password}</span> : null}
                    </label>

                    <label>
                        Tipo de usuario
                        <CustomSelect
                            value={createForm.user_type}
                            options={createUserTypeOptions}
                            onChange={(value) =>
                                setCreateForm((prev) => ({
                                    ...prev,
                                    user_type: value as ManagedUserType,
                                    full_name: value === 'psychologist' ? prev.full_name : '',
                                    professional_card_number:
                                        value === 'psychologist' ? prev.professional_card_number : ''
                                }))
                            }
                            ariaLabel="Seleccionar tipo de usuario para creación"
                        />
                        {formErrors.user_type ? <span className="usuarios-sub">{formErrors.user_type}</span> : null}
                    </label>

                    {createForm.user_type === 'psychologist' ? (
                        <>
                            <label>
                                <span>Nombre completo</span>
                                <input
                                    type="text"
                                    value={createForm.full_name}
                                    onChange={(event) =>
                                        setCreateForm((prev) => ({ ...prev, full_name: event.target.value }))
                                    }
                                />
                                {formErrors.full_name ? <span className="usuarios-sub">{formErrors.full_name}</span> : null}
                            </label>

                            <label>
                                <span>Tarjeta profesional</span>
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
                        </>
                    ) : null}

                    <div className="usuarios-modal-actions">
                        <button type="button" className="usuarios-btn secondary" onClick={closeCreateModal}>
                            Cancelar
                        </button>
                        <button type="submit" className="usuarios-btn primary" disabled={submittingCreate}>
                            {submittingCreate ? 'Creando...' : 'Crear usuario'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={Boolean(editingUser)} onClose={closeEditModal}>
                <form className="usuarios-modal" onSubmit={handleEditSubmit}>
                    <h2>Editar usuario</h2>

                    {editingUser ? (
                        <div className="usuarios-edit-summary">
                            <div><strong>Usuario:</strong> {editingUser.username}</div>
                            <div><strong>Correo:</strong> {editingUser.email}</div>
                            {editingUser.full_name ? <div><strong>Nombre completo:</strong> {editingUser.full_name}</div> : null}
                            {hasAdminRole(editingUser) ? (
                                <div><strong>Rol actual:</strong> Administrador</div>
                            ) : null}
                        </div>
                    ) : null}

                    {!editingUser || !hasAdminRole(editingUser) ? (
                        <label>
                            Tipo de usuario
                            <CustomSelect
                                value={editForm.user_type}
                                options={editableUserTypeOptions}
                                onChange={(value) =>
                                    setEditForm((prev) => ({
                                        ...prev,
                                        user_type: value as ManagedUserType,
                                        professional_card_number:
                                            value === 'psychologist' ? prev.professional_card_number : ''
                                    }))
                                }
                                ariaLabel="Seleccionar tipo de usuario para edición"
                            />
                            {formErrors.user_type ? <span className="usuarios-sub">{formErrors.user_type}</span> : null}
                        </label>
                    ) : null}

                    {!editingUser || !hasAdminRole(editingUser) ? (
                        <label>
                            <span>Rol derivado</span>
                            <input type="text" value={mapRoleLabel(USER_ROLE_BY_TYPE[editForm.user_type])} readOnly />
                        </label>
                    ) : null}

                    {(!editingUser || !hasAdminRole(editingUser)) && editForm.user_type === 'psychologist' ? (
                        <label>
                            <span>Tarjeta profesional</span>
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
                        <span>Usuario activo</span>
                    </label>

                    <div className="usuarios-modal-actions">
                        <button type="button" className="usuarios-btn secondary" onClick={closeEditModal}>
                            Cancelar
                        </button>
                        <button type="submit" className="usuarios-btn primary" disabled={submittingUpdate}>
                            {submittingUpdate ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                    </div>
                </form>
            </Modal>

            <UserConfirmationModal
                isOpen={Boolean(userToDeactivate)}
                title="Desactivar usuario"
                description={buildConfirmationMessage(userToDeactivate, 'deactivate')}
                confirmLabel="Confirmar"
                loadingLabel="Procesando..."
                isSubmitting={submittingDeactivate}
                onClose={() => setUserToDeactivate(null)}
                onConfirm={() => {
                    runUserTask(confirmDeactivate);
                }}
            />

            <UserConfirmationModal
                isOpen={Boolean(userToReactivate)}
                title="Reactivar usuario"
                description={buildConfirmationMessage(userToReactivate, 'reactivate')}
                confirmLabel="Reactivar"
                loadingLabel="Procesando..."
                isSubmitting={submittingReactivate}
                onClose={() => setUserToReactivate(null)}
                onConfirm={() => {
                    runUserTask(confirmReactivate);
                }}
            />

            <UserConfirmationModal
                isOpen={Boolean(userToResetPassword)}
                title="Restablecer contraseña"
                description={buildConfirmationMessage(userToResetPassword, 'password-reset')}
                confirmLabel="Confirmar"
                loadingLabel="Procesando..."
                isSubmitting={submittingPasswordReset}
                onClose={() => setUserToResetPassword(null)}
                onConfirm={() => {
                    runUserTask(confirmPasswordReset);
                }}
            />

            <UserConfirmationModal
                isOpen={Boolean(userToResetMfa)}
                title="Resetear MFA"
                description={buildConfirmationMessage(userToResetMfa, 'mfa-reset')}
                confirmLabel="Confirmar"
                loadingLabel="Procesando..."
                isSubmitting={submittingMfaReset}
                onClose={() => setUserToResetMfa(null)}
                onConfirm={() => {
                    runUserTask(confirmMfaReset);
                }}
            />
        </section>
    );
}
