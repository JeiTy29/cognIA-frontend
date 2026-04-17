export const PROBLEM_REPORT_ISSUE_TYPES = [
    'bug',
    'ui_issue',
    'data_issue',
    'performance',
    'questionnaire',
    'model_result',
    'other'
] as const;

export const PROBLEM_REPORT_STATUSES = [
    'open',
    'triaged',
    'in_progress',
    'resolved',
    'rejected'
] as const;

export const PROBLEM_REPORT_ATTACHMENTS_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export const PROBLEM_REPORT_ALLOWED_ATTACHMENT_MIMES = [
    'image/png',
    'image/jpeg',
    'image/webp'
] as const;

export type ProblemReportIssueType = (typeof PROBLEM_REPORT_ISSUE_TYPES)[number];
export type ProblemReportStatus = (typeof PROBLEM_REPORT_STATUSES)[number];
export type ProblemReportAttachmentMime = (typeof PROBLEM_REPORT_ALLOWED_ATTACHMENT_MIMES)[number];

export interface ProblemReportAttachment {
    attachment_id: string;
    storage_kind: string;
    original_filename: string;
    mime_type: string;
    size_bytes: number;
    created_at: string | null;
}

export interface ProblemReportItem {
    id: string;
    report_code: string;
    reporter_user_id: string;
    reporter_role: string | null;
    issue_type: string;
    description: string;
    status: string;
    source_module: string | null;
    source_path: string | null;
    related_questionnaire_session_id: string | null;
    related_questionnaire_history_id: string | null;
    admin_notes: string | null;
    resolved_at: string | null;
    attachment_count: number;
    attachments: ProblemReportAttachment[];
    metadata: Record<string, unknown> | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface ProblemReportPagination {
    page: number;
    page_size: number;
    total: number;
    pages: number;
}

export interface ProblemReportListResponse {
    items: ProblemReportItem[];
    pagination: ProblemReportPagination;
}

export interface ProblemReportDetailResponse {
    report: ProblemReportItem;
}

export interface CreateProblemReportPayload {
    issue_type: ProblemReportIssueType;
    description: string;
    source_module?: string;
    source_path?: string;
    related_questionnaire_session_id?: string;
    related_questionnaire_history_id?: string;
    metadata?: Record<string, unknown>;
    attachment?: File | null;
}

export interface CreateProblemReportResponse {
    report: ProblemReportItem;
}

export interface UpdateProblemReportPayload {
    status?: ProblemReportStatus;
    admin_notes?: string;
}

export interface UpdateProblemReportResponse {
    report: ProblemReportItem;
}

export function getProblemReportIssueTypeLabel(value: string) {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'bug') return 'Error';
    if (normalized === 'ui_issue') return 'Interfaz';
    if (normalized === 'data_issue') return 'Datos';
    if (normalized === 'performance') return 'Rendimiento';
    if (normalized === 'questionnaire') return 'Cuestionario';
    if (normalized === 'model_result') return 'Resultado del modelo';
    if (normalized === 'other') return 'Otro';
    return value || '--';
}

export function getProblemReportStatusLabel(value: string) {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'open') return 'Abierto';
    if (normalized === 'triaged') return 'Triagado';
    if (normalized === 'in_progress') return 'En progreso';
    if (normalized === 'resolved') return 'Resuelto';
    if (normalized === 'rejected') return 'Rechazado';
    return value || '--';
}

export function getProblemReportReporterRoleLabel(value: string | null) {
    if (!value) return '--';
    const normalized = value.trim().toUpperCase();
    if (normalized === 'ADMIN') return 'Administrador';
    if (normalized === 'PSYCHOLOGIST') return 'Psicólogo';
    if (normalized === 'GUARDIAN') return 'Padre/Tutor';
    return value;
}
