import type { AuditLogItem } from '../../services/admin/audit';
import type { AdminQuestionnaireItem, AdminQuestionnairesResponse, ListAdminQuestionnairesParams } from '../../services/admin/questionnaires';
import type { PaginatedUsersResponse, User, UsersListParams } from '../../services/admin/users';
import type { ProblemReportDetailResponse, ProblemReportItem, ProblemReportListResponse, UpdateProblemReportPayload } from '../../services/problemReports/problemReports.types';

const DEV_AUTH_ACTIVE_KEY = 'cognia_dev_auth_active';

function nowIso(daysBack = 0) {
    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    date.setHours(10 + (daysBack % 8), 20, 0, 0);
    return date.toISOString();
}

function paginate<T>(items: T[], page: number, pageSize: number) {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
}

function pagination(total: number, page: number, pageSize: number) {
    return {
        page,
        page_size: pageSize,
        total,
        pages: Math.max(1, Math.ceil(total / Math.max(pageSize, 1)))
    };
}

export function isAdminDevDemoEnabled() {
    if (!import.meta.env.DEV || typeof window === 'undefined') return false;
    if (import.meta.env.VITE_ENABLE_DEMO_DATA !== 'true') return false;
    if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) return false;
    const params = new URLSearchParams(window.location.search);
    const role = params.get('devRole') ?? window.sessionStorage.getItem('cognia_dev_role');
    const auth = params.get('devAuth') ?? (window.sessionStorage.getItem(DEV_AUTH_ACTIVE_KEY) === 'true' ? 'on' : null);
    return auth === 'on' && role === 'admin';
}

export const demoAdminUsers: User[] = [
    {
        id: 'demo-admin-1',
        username: 'admin_demo',
        email: 'admin.demo@cognia.local',
        full_name: 'Administradora CognIA',
        user_type: 'admin',
        professional_card_number: null,
        colpsic_verified: true,
        is_active: true,
        roles: ['ADMIN'],
        created_at: nowIso(75),
        updated_at: nowIso(1),
        review_status: 'approved'
    },
    {
        id: 'demo-guardian-1',
        username: 'familia_mateo',
        email: 'familia.mateo@cognia.local',
        full_name: 'Acudiente Mateo',
        user_type: 'guardian',
        professional_card_number: null,
        colpsic_verified: false,
        is_active: true,
        roles: ['GUARDIAN'],
        created_at: nowIso(42),
        updated_at: nowIso(2)
    },
    {
        id: 'demo-guardian-2',
        username: 'tutor_escolar',
        email: 'tutor.escolar@cognia.local',
        full_name: 'Tutor Escolar',
        user_type: 'guardian',
        professional_card_number: null,
        colpsic_verified: false,
        is_active: true,
        roles: ['GUARDIAN'],
        created_at: nowIso(28),
        updated_at: nowIso(3)
    },
    {
        id: 'demo-psych-1',
        username: 'psicologa_valeria',
        email: 'valeria.psicologia@cognia.local',
        full_name: 'Valeria Restrepo',
        user_type: 'psychologist',
        professional_card_number: 'COLPSIC-18420',
        colpsic_verified: true,
        is_active: true,
        roles: ['PSYCHOLOGIST'],
        created_at: nowIso(35),
        updated_at: nowIso(1),
        review_status: 'approved',
        approval_status: 'approved'
    },
    {
        id: 'demo-psych-2',
        username: 'psicologo_pendiente',
        email: 'pendiente.psicologia@cognia.local',
        full_name: 'Daniela Torres',
        user_type: 'psychologist',
        professional_card_number: 'COLPSIC-99210',
        colpsic_verified: false,
        is_active: true,
        roles: ['PSYCHOLOGIST'],
        created_at: nowIso(7),
        updated_at: nowIso(7),
        review_status: 'pending',
        approval_status: 'pending'
    },
    {
        id: 'demo-psych-3',
        username: 'psicologo_rechazado',
        email: 'rechazado.psicologia@cognia.local',
        full_name: 'Carlos Rivas',
        user_type: 'psychologist',
        professional_card_number: 'COLPSIC-00001',
        colpsic_verified: false,
        is_active: false,
        roles: ['PSYCHOLOGIST'],
        created_at: nowIso(12),
        updated_at: nowIso(5),
        review_status: 'rejected',
        approval_status: 'rejected',
        rejection_reason: 'Documento profesional ilegible.'
    }
];

export function getDemoUsersResponse(params: UsersListParams): PaginatedUsersResponse {
    const filtered = demoAdminUsers.filter((user) => {
        const query = params.q?.trim().toLowerCase();
        const matchesQuery = !query || [user.username, user.email, user.full_name ?? ''].some((value) => value.toLowerCase().includes(query));
        const matchesRole = !params.role || user.roles.some((role) => role.toUpperCase() === params.role?.toUpperCase());
        const matchesActive = typeof params.is_active !== 'boolean' || user.is_active === params.is_active;
        return matchesQuery && matchesRole && matchesActive;
    });
    return {
        items: paginate(filtered, params.page, params.page_size),
        pagination: pagination(filtered.length, params.page, params.page_size)
    };
}

export const demoAdminQuestionnaires: AdminQuestionnaireItem[] = [
    { id: 'template-adhd', name: 'Seguimiento TDAH escolar', version: '2026.1', description: 'Indicadores de inatención e hiperactividad.', is_active: true, is_archived: false, created_at: nowIso(60), updated_at: nowIso(3) },
    { id: 'template-anxiety', name: 'Ansiedad y adaptación', version: '2026.1', description: 'Tamizaje orientativo de ansiedad.', is_active: true, is_archived: false, created_at: nowIso(52), updated_at: nowIso(4) },
    { id: 'template-conduct', name: 'Conducta y convivencia', version: '2026.2', description: 'Seguimiento conductual familiar y escolar.', is_active: false, is_archived: false, created_at: nowIso(38), updated_at: nowIso(8) },
    { id: 'template-depression-legacy', name: 'Bienestar emocional legacy', version: '2025.4', description: 'Plantilla archivada de bienestar emocional.', is_active: false, is_archived: true, created_at: nowIso(120), updated_at: nowIso(80) }
];

export function getDemoQuestionnairesResponse(params: ListAdminQuestionnairesParams): AdminQuestionnairesResponse {
    const filtered = demoAdminQuestionnaires.filter((item) => {
        const matchesName = !params.name || item.name.toLowerCase().includes(params.name.toLowerCase());
        const matchesVersion = !params.version || item.version.toLowerCase().includes(params.version.toLowerCase());
        const matchesActive = typeof params.is_active !== 'boolean' || item.is_active === params.is_active;
        const matchesArchived = typeof params.is_archived !== 'boolean' || item.is_archived === params.is_archived;
        return matchesName && matchesVersion && matchesActive && matchesArchived;
    });
    return {
        items: paginate(filtered, params.page, params.page_size),
        pagination: pagination(filtered.length, params.page, params.page_size)
    };
}

export const demoAuditLogs: AuditLogItem[] = [
    { id: 'audit-1', timestamp: nowIso(0), action: 'QUESTIONNAIRE_PDF_GENERATED', userId: 'demo-guardian-1', section: 'questionnaires', actor: 'Acudiente Mateo', target: 'CASO-A1F4C3', summary: 'PDF de cuestionario generado para seguimiento familiar.', raw: {} },
    { id: 'audit-2', timestamp: nowIso(1), action: 'QUESTIONNAIRE_SHARED', userId: 'demo-guardian-2', section: 'questionnaires', actor: 'Tutor Escolar', target: 'Valeria Restrepo', summary: 'Resultado compartido para revisión profesional.', raw: {} },
    { id: 'audit-3', timestamp: nowIso(2), action: 'PSYCHOLOGIST_APPROVED', userId: 'demo-admin-1', section: 'psychologists', actor: 'Administradora CognIA', target: 'Valeria Restrepo', summary: 'Psicóloga verificada por administrador.', raw: {} },
    { id: 'audit-4', timestamp: nowIso(3), action: 'USER_CREATED', userId: 'demo-admin-1', section: 'users', actor: 'Administradora CognIA', target: 'familia_mateo', summary: 'Usuario padre/tutor creado.', raw: {} },
    { id: 'audit-5', timestamp: nowIso(5), action: 'PROBLEM_REPORT_UPDATED', userId: 'demo-admin-1', section: 'reports', actor: 'Administradora CognIA', target: 'REP-1024', summary: 'Reporte de interfaz triagado.', raw: {} }
];

export const demoProblemReports: ProblemReportItem[] = [
    {
        id: 'problem-1',
        report_code: 'REP-1024',
        reporter_user_id: 'demo-guardian-1',
        reporter_role: 'GUARDIAN',
        issue_type: 'ui_issue',
        description: 'El botón de descarga PDF no era evidente en el detalle de cuestionario.',
        status: 'triaged',
        source_module: 'questionnaires',
        source_path: '/padre/historial',
        related_questionnaire_session_id: 'demo-session-mateo-5',
        related_questionnaire_history_id: 'demo-session-mateo-5',
        admin_notes: 'Revisado en reconstrucción visual.',
        resolved_at: null,
        attachment_count: 1,
        attachments: [{ attachment_id: 'att-1', storage_kind: 'local-demo', original_filename: 'historial-detalle.png', mime_type: 'image/png', size_bytes: 128000, created_at: nowIso(2) }],
        metadata: { viewport: '1365x768' },
        created_at: nowIso(4),
        updated_at: nowIso(1)
    },
    {
        id: 'problem-2',
        report_code: 'REP-1025',
        reporter_user_id: 'demo-psych-1',
        reporter_role: 'PSYCHOLOGIST',
        issue_type: 'data_issue',
        description: 'La etiqueta de dominio debe mostrarse como TDAH y no como clave t?cnica.',
        status: 'resolved',
        source_module: 'psychologist_dashboard',
        source_path: '/psicologo/evaluaciones',
        related_questionnaire_session_id: null,
        related_questionnaire_history_id: null,
        admin_notes: 'Mapeo corregido en frontend.',
        resolved_at: nowIso(0),
        attachment_count: 0,
        attachments: [],
        metadata: { contract: 'api/v2' },
        created_at: nowIso(8),
        updated_at: nowIso(0)
    }
];

export function getDemoProblemReportsResponse(page: number, pageSize: number): ProblemReportListResponse {
    return {
        items: paginate(demoProblemReports, page, pageSize),
        pagination: pagination(demoProblemReports.length, page, pageSize)
    };
}

export function getDemoProblemReportDetail(reportId: string): ProblemReportDetailResponse {
    return { report: demoProblemReports.find((item) => item.id === reportId) ?? demoProblemReports[0] };
}

export function updateDemoProblemReport(reportId: string, payload: UpdateProblemReportPayload): ProblemReportDetailResponse {
    const report = demoProblemReports.find((item) => item.id === reportId) ?? demoProblemReports[0];
    return {
        report: {
            ...report,
            status: payload.status ?? report.status,
            admin_notes: payload.admin_notes ?? report.admin_notes,
            updated_at: nowIso(0)
        }
    };
}
