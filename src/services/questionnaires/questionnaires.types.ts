export type QuestionnaireV2Mode = 'short' | 'medium' | 'complete';
export type QuestionnaireV2Role = 'caregiver' | 'psychologist';
export type QuestionnaireV2Status = 'draft' | 'submitted' | 'processed' | string;
export type QuestionnaireResponseType = 'likert' | 'boolean' | 'integer' | 'text' | string;
export type QuestionnaireResponseValue = string | number | boolean | null;

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
    visibility?: 'private' | 'shared' | 'public' | string | null;
    [key: string]: unknown;
}

export interface AddQuestionnaireTagPayload {
    tag: string;
    color?: string;
    visibility?: 'private' | 'shared' | 'public';
}

export interface ShareQuestionnairePayload {
    expires_in_hours?: number;
    allow_pdf_access?: boolean;
}

export interface DownloadPdfResult {
    blob: Blob;
    filename: string;
}
