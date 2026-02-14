import { useMemo } from 'react';
import './Usuarios.css';

const mockUsers = {
    items: [
        {
            id: 'u-001',
            username: 'admin_cognia',
            email: 'admin@cognia.com',
            full_name: 'Administrador CognIA',
            user_type: 'admin',
            professional_card_number: null,
            is_active: true,
            roles: ['ADMIN'],
            created_at: '2026-01-10T10:32:00Z',
            updated_at: '2026-02-01T09:15:00Z'
        },
        {
            id: 'u-002',
            username: 'psico_lucia',
            email: 'lucia.psico@cognia.com',
            full_name: 'Lucia Herrera',
            user_type: 'psychologist',
            professional_card_number: 'TP-8942',
            is_active: true,
            roles: ['PSYCHOLOGIST'],
            created_at: '2026-01-15T12:05:00Z',
            updated_at: '2026-02-05T11:22:00Z'
        },
        {
            id: 'u-003',
            username: 'docente_jp',
            email: 'juan.perez@colegio.edu',
            full_name: 'Juan Perez',
            user_type: 'guardian',
            professional_card_number: null,
            is_active: true,
            roles: ['GUARDIAN'],
            created_at: '2026-01-18T14:40:00Z',
            updated_at: '2026-02-08T08:10:00Z'
        },
        {
            id: 'u-004',
            username: 'padre_maria',
            email: 'maria.ramos@gmail.com',
            full_name: null,
            user_type: 'guardian',
            professional_card_number: null,
            is_active: false,
            roles: ['GUARDIAN'],
            created_at: '2026-01-20T09:18:00Z',
            updated_at: '2026-01-25T10:40:00Z'
        },
        {
            id: 'u-005',
            username: 'psico_david',
            email: 'david.psico@cognia.com',
            full_name: 'David Orozco',
            user_type: 'psychologist',
            professional_card_number: 'TP-1023',
            is_active: true,
            roles: ['PSYCHOLOGIST'],
            created_at: '2026-01-22T15:12:00Z',
            updated_at: '2026-02-07T07:55:00Z'
        },
        {
            id: 'u-006',
            username: 'docente_ana',
            email: 'ana.rojas@colegio.edu',
            full_name: 'Ana Rojas',
            user_type: 'guardian',
            professional_card_number: null,
            is_active: true,
            roles: ['GUARDIAN'],
            created_at: '2026-01-26T11:30:00Z',
            updated_at: '2026-02-06T13:02:00Z'
        },
        {
            id: 'u-007',
            username: 'psico_sin',
            email: 'psico.sinnombre@cognia.com',
            full_name: '',
            user_type: 'psychologist',
            professional_card_number: 'TP-5678',
            is_active: false,
            roles: ['PSYCHOLOGIST'],
            created_at: '2026-01-28T18:20:00Z',
            updated_at: '2026-02-02T09:00:00Z'
        },
        {
            id: 'u-008',
            username: 'soporte_cognia',
            email: 'soporte@cognia.com',
            full_name: 'Soporte CognIA',
            user_type: 'admin',
            professional_card_number: null,
            is_active: true,
            roles: ['ADMIN'],
            created_at: '2026-01-30T10:10:00Z',
            updated_at: '2026-02-09T12:00:00Z'
        },
        {
            id: 'u-009',
            username: 'padre_andres',
            email: 'andres.gomez@gmail.com',
            full_name: 'Andres Gomez',
            user_type: 'guardian',
            professional_card_number: null,
            is_active: true,
            roles: [],
            created_at: '2026-02-01T13:44:00Z',
            updated_at: '2026-02-10T09:45:00Z'
        },
        {
            id: 'u-010',
            username: 'psico_vale',
            email: 'valentina.psico@cognia.com',
            full_name: 'Valentina Mendez',
            user_type: 'psychologist',
            professional_card_number: null,
            is_active: true,
            roles: ['PSYCHOLOGIST'],
            created_at: '2026-02-03T16:25:00Z',
            updated_at: '2026-02-11T08:05:00Z'
        }
    ],
    page: 1,
    page_size: 10,
    total: 42
};

const rowState = 'table' as const; // table | loading | empty

function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleDateString('es-CO');
}

function formatUserType(userType: string) {
    if (userType === 'admin') return 'Administrador';
    if (userType === 'psychologist') return 'Psicologo';
    return 'Padre/Tutor';
}

function formatRoles(roles: string[]) {
    if (!roles || roles.length === 0) return 'Sin rol';
    return roles
        .map((role) => {
            const normalized = role.trim().toUpperCase();
            if (normalized === 'ADMIN') return 'Administrador';
            if (normalized === 'PSYCHOLOGIST') return 'Psicologo';
            if (normalized === 'GUARDIAN') return 'Padre/Tutor';
            return role;
        })
        .join(' / ');
}

export default function Usuarios() {
    const { items, page, page_size: pageSize, total } = mockUsers;

    const showingFrom = (page - 1) * pageSize + 1;
    const showingTo = Math.min(page * pageSize, total);

    const showLoading = rowState === 'loading';
    const showEmpty = rowState === 'empty';

    const rows = useMemo(() => items.map((user) => {
        const fullName = user.full_name && user.full_name.trim().length > 0 ? user.full_name : 'Sin nombre';
        const roles = formatRoles(user.roles ?? []);
        return {
            ...user,
            fullName,
            rolesLabel: roles
        };
    }), [items]);

    return (
        <div className="usuarios">
            <header className="usuarios-header">
                <div className="usuarios-title">
                    <span className="usuarios-title-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M7 13a4 4 0 1 1 4-4 4 4 0 0 1-4 4Zm10 0a3 3 0 1 1 3-3 3 3 0 0 1-3 3ZM2 20a6 6 0 0 1 12 0v1H2Zm13 1v-1a6 6 0 0 0-2-4.47 5 5 0 0 1 8 4.47v1Z" /></svg>
                    </span>
                    <div>
                        <h1>Usuarios</h1>
                        <p>Gestiona cuentas registradas, roles y estados en la plataforma.</p>
                    </div>
                </div>
                <div className="usuarios-actions">
                    <button type="button" className="usuarios-btn primary" aria-label="Crear usuario">
                        <span aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M11 4h2v6h6v2h-6v6h-2v-6H5v-2h6Z" /></svg>
                        </span>
                        Nuevo
                    </button>
                    <button type="button" className="usuarios-btn secondary" aria-label="Exportar usuarios">
                        <span aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M12 3v10m0 0 4-4m-4 4-4-4M5 19h14v2H5z" /></svg>
                        </span>
                        Exportar
                    </button>
                </div>
            </header>

            <div className="usuarios-divider" aria-hidden="true" />

            <section className="usuarios-controls" aria-label="Controles de busqueda">
                <div className="usuarios-search">
                    <span className="usuarios-search-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M11 4a7 7 0 1 1-4.95 11.95l-3.5 3.5 1.4 1.4 3.5-3.5A7 7 0 0 1 11 4Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" /></svg>
                    </span>
                    <input type="search" placeholder="Buscar usuario..." aria-label="Buscar usuario" />
                </div>
                <div className="usuarios-filters">
                    <label>
                        <span>Estado</span>
                        <select aria-label="Estado">
                            <option>Todos</option>
                            <option>Activos</option>
                            <option>Inactivos</option>
                        </select>
                    </label>
                    <label>
                        <span>Rol</span>
                        <select aria-label="Rol">
                            <option>Todos</option>
                            <option>Admin</option>
                            <option>Psicologo</option>
                            <option>Docente</option>
                            <option>Padre/Tutor</option>
                        </select>
                    </label>
                    <button type="button" className="usuarios-btn ghost" aria-label="Limpiar filtros">
                        <span aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M6 6h12v2H6zm3 5h6v2H9zm-2 5h10v2H7z" /></svg>
                        </span>
                        Limpiar
                    </button>
                </div>
            </section>

            <section className="usuarios-table" aria-label="Listado de usuarios">
                <div className="usuarios-table-head">
                    <span>Usuario</span>
                    <span>Correo</span>
                    <span>Tipo / Rol</span>
                    <span>Estado</span>
                    <span>Creado</span>
                    <span>Acciones</span>
                </div>

                {showLoading ? (
                    <div className="usuarios-skeleton">
                        {Array.from({ length: 7 }).map((_, index) => (
                            <div key={`skeleton-${index}`} className="usuarios-skeleton-row">
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

                {showEmpty ? (
                    <div className="usuarios-empty" role="status">
                        <div className="usuarios-empty-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" /></svg>
                        </div>
                        <h3>Sin usuarios</h3>
                        <p>No hay registros disponibles con los filtros actuales.</p>
                        <button type="button" className="usuarios-btn primary">Nuevo</button>
                    </div>
                ) : null}

                {!showLoading && !showEmpty ? (
                    <div className="usuarios-table-body">
                        {rows.map((user) => (
                            <div key={user.id} className="usuarios-row">
                                <div className="usuarios-cell user">
                                    <div className="usuarios-name">{user.fullName}</div>
                                    <div className="usuarios-sub">{user.username}</div>
                                </div>
                                <div className="usuarios-cell">{user.email}</div>
                                <div className="usuarios-cell">
                                    <div className="usuarios-type">{formatUserType(user.user_type)}</div>
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
                                    <button type="button" className="icon-btn" aria-label="Ver usuario">
                                        <svg viewBox="0 0 24 24"><path d="M12 5c5 0 9 5 9 7s-4 7-9 7-9-5-9-7 4-7 9-7Zm0 2c-3.4 0-6.4 3.2-6.8 5 .4 1.8 3.4 5 6.8 5s6.4-3.2 6.8-5c-.4-1.8-3.4-5-6.8-5Zm0 2.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z" /></svg>
                                    </button>
                                    <button type="button" className="icon-btn" aria-label="Editar usuario">
                                        <svg viewBox="0 0 24 24"><path d="m3 17 1 4 4-1 10-10-4-4L3 17Zm14-12 4 4 1-1-4-4Z" /></svg>
                                    </button>
                                    <button type="button" className="icon-btn" aria-label="Desactivar usuario">
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
                    Mostrando {showingFrom}-{showingTo} de {total}
                </div>
                <div className="usuarios-pagination-controls">
                    <button type="button" className="icon-btn" aria-label="Pagina anterior">
                        <svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7" /></svg>
                    </button>
                    <span className="usuarios-page">Pagina {page}</span>
                    <button type="button" className="icon-btn" aria-label="Pagina siguiente">
                        <svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" /></svg>
                    </button>
                </div>
                <div className="usuarios-page-size">
                    <label>
                        <span>Tamano</span>
                        <select aria-label="Tamano de pagina">
                            <option>10</option>
                            <option>25</option>
                            <option>50</option>
                        </select>
                    </label>
                </div>
            </footer>
        </div>
    );
}
