export type QuestionnaireV2Mode = 'short' | 'medium' | 'complete';
export type QuestionnaireV2Role = 'caregiver' | 'psychologist';
export type QuestionnaireV2Status =
    | 'draft'
    | 'in_progress'
    | 'submitted'
    | 'processed'
    | 'failed'
    | 'archived'
    | string;
export type QuestionnaireResponseType = 'likert' | 'boolean' | 'integer' | 'text' | string;
export type QuestionnaireResponseValue = string | number | boolean | null;
export type QuestionnaireTagVisibility = 'private' | 'shared';

export interface PaginationDTO {
    page: number;
    page_size: number;
    total: number;
    pages: number;
}

export interface QuestionnaireTemplateV2DTO {
    id: string;
    name?: string;
    version?: string;
    description?: string | null;
    is_active?: boolean;
    is_archived?: boolean;
    [key: string]: unknown;
}

export interface QuestionnaireQuestionV2DTO {
    id: string;
    code?: string;
    text: string;
    response_type: QuestionnaireResponseType;
    position?: number;
    response_min?: number | null;
    response_max?: number | null;
    response_step?: number | null;
    response_options?: Array<number | string> | null;
    [key: string]: unknown;
}

export interface QuestionnaireAnswerV2DTO {
    question_id: string;
    answer: QuestionnaireResponseValue;
}

export interface ActiveQuestionnairesV2Response {
    items: QuestionnaireTemplateV2DTO[];
    pagination: PaginationDTO;
}

export interface CreateQuestionnaireSessionV2Payload {
    mode: QuestionnaireV2Mode;
    role: QuestionnaireV2Role;
    child_age_years?: 6 | 7 | 8 | 9 | 10 | 11;
    child_sex_assigned_at_birth?: string;
    metadata?: Record<string, unknown>;
}

export interface QuestionnaireSessionV2DTO {
    id: string;
    questionnaire_template_id?: string;
    status?: QuestionnaireV2Status;
    mode?: QuestionnaireV2Mode;
    role?: QuestionnaireV2Role;
    title?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    answers?: QuestionnaireAnswerV2DTO[] | Record<string, QuestionnaireResponseValue>;
    [key: string]: unknown;
}

export interface QuestionnaireSessionPageV2Response {
    items: QuestionnaireQuestionV2DTO[];
    pagination: PaginationDTO;
}

export interface PatchSessionAnswersV2Payload {
    answers: QuestionnaireAnswerV2DTO[];
    mark_final?: boolean;
}

export interface SubmitSessionV2Payload {
    force_reprocess?: boolean;
}

export interface QuestionnaireHistoryItemV2DTO {
    id: string;
    status?: QuestionnaireV2Status;
    mode?: QuestionnaireV2Mode;
    role?: QuestionnaireV2Role;
    title?: string | null;
    name?: string | null;
    version?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    [key: string]: unknown;
}

export interface QuestionnaireHistoryListV2Response {
    items: QuestionnaireHistoryItemV2DTO[];
    pagination: PaginationDTO;
}

export interface QuestionnaireTagDTO {
    id?: string;
    tag?: string;
    color?: string | null;
    visibility?: QuestionnaireTagVisibility | string | null;
    [key: string]: unknown;
}

export interface AddQuestionnaireTagPayload {
    tag: string;
    color?: string;
    visibility?: QuestionnaireTagVisibility;
}

export interface ShareQuestionnairePayload {
    expires_in_hours?: number;
    max_uses?: number;
    grantee_user_id?: string;
    grant_can_tag: boolean;
    grant_can_download_pdf: boolean;
}

export interface DownloadPdfResult {
    blob: Blob;
    filename: string;
}
