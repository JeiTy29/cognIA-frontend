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
export type QuestionnaireResponseType = 'likert' | 'boolean' | 'integer' | 'number' | 'text' | string;
export type QuestionnaireResponseValue = string | number | boolean | null;
export type QuestionnaireTagVisibility = 'private' | 'shared';
export type QuestionnairePrimitive = string | number | boolean | null;
export type QuestionnaireHistoryStatusFilter =
    | 'draft'
    | 'in_progress'
    | 'submitted'
    | 'processed'
    | 'failed'
    | 'archived';

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
    response_options?: unknown[] | null;
    [key: string]: unknown;
}

export interface QuestionnaireAnswerV2DTO {
    question_id: string;
    answer: QuestionnaireResponseValue;
}

export interface QuestionnaireOptionDTO {
    value: QuestionnairePrimitive;
    label: string;
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
}

export interface QuestionnaireHistoryItemV2DTO {
    id: string;
    questionnaire_id?: string | null;
    share_code?: string | null;
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
    tag_id?: string;
    tag?: string;
    color?: string | null;
    visibility?: QuestionnaireTagVisibility | string | null;
    created_at?: string | null;
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
    grant_can_tag?: boolean;
    grant_can_download_pdf?: boolean;
}

export interface QuestionnaireShareResponseDTO {
    questionnaire_id?: string;
    share_code?: string;
    url?: string;
    share_url?: string;
    public_url?: string;
    link?: string;
    expires_at?: string | null;
    max_uses?: number | null;
    uses?: number | null;
    [key: string]: unknown;
}

export interface QuestionnairePdfInfoV2DTO {
    status?: string;
    file_id?: string;
    filename?: string;
    mime_type?: string;
    size_bytes?: number;
    generated_at?: string | null;
    updated_at?: string | null;
    download_url?: string;
    [key: string]: unknown;
}

export interface QuestionnaireHistoryDetailV2DTO extends QuestionnaireHistoryItemV2DTO {
    tags?: QuestionnaireTagDTO[];
    answers?: QuestionnaireAnswerV2DTO[] | Record<string, QuestionnaireResponseValue>;
    metadata?: Record<string, unknown> | null;
    [key: string]: unknown;
}

export interface QuestionnaireSharedDataV2DTO {
    questionnaire_id?: string;
    share_code?: string;
    name?: string;
    title?: string;
    version?: string;
    status?: string;
    mode?: QuestionnaireV2Mode;
    role?: QuestionnaireV2Role;
    created_at?: string | null;
    updated_at?: string | null;
    expires_at?: string | null;
    tags?: QuestionnaireTagDTO[];
    results?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
    [key: string]: unknown;
}

export interface DownloadPdfResult {
    blob: Blob;
    filename: string;
}
