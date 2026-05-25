export type QuestionnaireV2Mode = 'short' | 'medium' | 'complete';
export type QuestionnaireV2Role = 'guardian' | 'psychologist';
type FlexibleString<T extends string> = T | (string & {});
export type QuestionnaireRiskLevel = FlexibleString<'baja' | 'intermedia' | 'relevante' | 'alta'>;
export type QuestionnaireV2Status =
    FlexibleString<'draft' | 'in_progress' | 'submitted' | 'processed' | 'failed' | 'archived'>;
export type QuestionnaireResponseType = FlexibleString<'likert' | 'boolean' | 'integer' | 'number' | 'text'>;
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

export interface QuestionnaireEvaluationResultDTO {
    summary?: string | null;
    operational_recommendation?: string | null;
    completion_quality_score?: number | null;
    missingness_score?: number | null;
    needs_professional_review?: boolean | null;
    [key: string]: unknown;
}

export interface QuestionnaireEvaluationDomainDTO {
    domain?: string | null;
    probability?: number | null;
    alert_level?: string | null;
    confidence_pct?: number | null;
    confidence_band?: string | null;
    model_id?: string | null;
    model_version?: string | null;
    mode?: string | null;
    operational_class?: string | null;
    operational_caveat?: string | null;
    result_summary?: string | null;
    needs_professional_review?: boolean | null;
    [key: string]: unknown;
}

export interface QuestionnaireEvaluationComorbidityDTO {
    coexistence_key?: string | null;
    domains?: string[];
    combined_risk_score?: number | null;
    coexistence_level?: string | null;
    summary?: string | null;
    [key: string]: unknown;
}

export interface QuestionnaireSubmitResponseV2DTO {
    session_id?: string;
    questionnaire_id?: string;
    status?: QuestionnaireV2Status;
    submitted_at?: string | null;
    processed_at?: string | null;
    result?: QuestionnaireEvaluationResultDTO | null;
    domains?: QuestionnaireEvaluationDomainDTO[];
    comorbidity?: QuestionnaireEvaluationComorbidityDTO[];
    metadata?: Record<string, unknown> | null;
    [key: string]: unknown;
}

export interface QuestionnaireSecureResultsV2DTO {
    session: QuestionnaireSessionV2DTO;
    result: QuestionnaireEvaluationResultDTO | null;
    domains: QuestionnaireEvaluationDomainDTO[];
    comorbidity: QuestionnaireEvaluationComorbidityDTO[];
    [key: string]: unknown;
}

export interface QuestionnaireClinicalNarrativeV2DTO {
    sintesis_general?: string | null;
    niveles_de_compatibilidad?: string | null;
    indicadores_principales_observados?: string | null;
    impacto_funcional?: string | null;
    recomendacion_profesional?: string | null;
    aclaracion_importante?: string | null;
    [key: string]: unknown;
}

export interface QuestionnaireClinicalDomainV2DTO {
    domain?: string | null;
    probability?: number | null;
    compatibility_level?: QuestionnaireRiskLevel | null;
    risk_level?: QuestionnaireRiskLevel | null;
    confidence_pct?: number | null;
    confidence_band?: string | null;
    operational_class?: string | null;
    caveat?: string | null;
    main_indicators?: string[] | null;
    [key: string]: unknown;
}

export interface QuestionnaireClinicalComorbidityV2DTO {
    has_comorbidity_signal?: boolean | null;
    severity?: string | null;
    domains?: string[] | null;
    summary?: string | null;
    [key: string]: unknown;
}

export interface QuestionnaireClinicalSectionV2DTO {
    key?: string | null;
    title?: string | null;
    content?: string | null;
    [key: string]: unknown;
}

export interface QuestionnaireClinicalSummaryV2DTO {
    session_id?: string | null;
    report_version?: string | null;
    generated_at?: string | null;
    overall_risk_level?: QuestionnaireRiskLevel | null;
    simulated_diagnostic_text?: QuestionnaireClinicalNarrativeV2DTO | null;
    sections?: QuestionnaireClinicalSectionV2DTO[] | Record<string, string | null> | null;
    domains?: QuestionnaireClinicalDomainV2DTO[];
    comorbidity?: QuestionnaireClinicalComorbidityV2DTO | null;
    disclaimer?: string | null;
    [key: string]: unknown;
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
    session_id?: string;
    questionnaire_id?: string;
    questionnaire_template_id?: string;
    status?: QuestionnaireV2Status;
    mode?: QuestionnaireV2Mode;
    role?: QuestionnaireV2Role;
    mode_key?: string | null;
    progress_pct?: number | null;
    version?: string | null;
    result?: QuestionnaireEvaluationResultDTO | null;
    domains?: QuestionnaireEvaluationDomainDTO[];
    comorbidity?: QuestionnaireEvaluationComorbidityDTO[];
    metadata?: Record<string, unknown> | null;
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
    session_id?: string | null;
    questionnaire_session_id?: string | null;
    questionnaire_id?: string | null;
    share_code?: string | null;
    case_id?: string | null;
    case_public_id?: string | null;
    case_display_label?: string | null;
    case_private_label?: string | null;
    tags?: Array<QuestionnaireTagDTO | string>;
    latest_alert_level?: string | null;
    dominant_domain?: string | null;
    needs_professional_review?: boolean | null;
    submitted_at?: string | null;
    processed_at?: string | null;
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
    filters?: Record<string, unknown> | null;
    summary?: Record<string, unknown> | null;
    charts?: Record<string, QuestionnaireDashboardChartPointDTO[]> | null;
}

export interface QuestionnaireCasesFiltersV2 {
    status?: string;
    q?: string;
    label?: string;
    case_public_id?: string;
    has_sessions?: boolean;
    latest_alert_level?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
}

export interface QuestionnaireHistoryFiltersV2 {
    status?: QuestionnaireHistoryStatusFilter;
    case_id?: string;
    case_public_id?: string;
    case_label?: string;
    tag?: string;
    q?: string;
    date_from?: string;
    date_to?: string;
    domain?: string;
    alert_level?: string;
    needs_professional_review?: boolean;
    page?: number;
    page_size?: number;
}

export interface QuestionnaireGuardianDashboardFiltersV2 {
    months?: number;
    date_from?: string;
    date_to?: string;
    case_id?: string;
    case_public_id?: string;
    case_label?: string;
    q?: string;
    domain?: string;
    alert_level?: string;
}

export interface QuestionnairePsychologistDashboardFiltersV2 {
    q?: string;
    case_public_id?: string;
    date_from?: string;
    date_to?: string;
    domain?: string;
    alert_level?: string;
    review_status?: string;
    page?: number;
    page_size?: number;
}

export interface QuestionnaireDashboardChartPointDTO {
    key?: string | null;
    label?: string | null;
    name?: string | null;
    date?: string | null;
    month?: string | null;
    domain?: string | null;
    alert_level?: string | null;
    value?: number | null;
    count?: number | null;
    sessions?: number | null;
    total?: number | null;
    [key: string]: unknown;
}

export interface QuestionnaireCaseV2DTO {
    case_id: string;
    case_public_id?: string | null;
    private_label?: string | null;
    display_label?: string | null;
    status?: string | null;
    sessions_count?: number | null;
    processed_sessions_count?: number | null;
    draft_sessions_count?: number | null;
    in_progress_sessions_count?: number | null;
    latest_session_id?: string | null;
    latest_processed_at?: string | null;
    latest_alert_level?: string | null;
    latest_domain?: string | null;
    tags?: Array<QuestionnaireTagDTO | string>;
    [key: string]: unknown;
}

export interface QuestionnaireCasesListV2Response {
    items: QuestionnaireCaseV2DTO[];
    pagination: PaginationDTO;
    warnings?: string[];
    [key: string]: unknown;
}

export interface QuestionnaireCaseDetailV2Response {
    case: QuestionnaireCaseV2DTO | null;
    sessions: QuestionnaireHistoryItemV2DTO[];
    domain_summary: QuestionnaireDashboardChartPointDTO[];
    trend: QuestionnaireDashboardChartPointDTO[];
    warnings?: string[];
    [key: string]: unknown;
}

export interface QuestionnaireGuardianDashboardV2Response {
    period?: Record<string, unknown> | null;
    filters?: Record<string, unknown> | null;
    summary?: Record<string, unknown> | null;
    charts?: {
        alerts_by_month?: QuestionnaireDashboardChartPointDTO[];
        alerts_by_domain?: QuestionnaireDashboardChartPointDTO[];
        alerts_by_level?: QuestionnaireDashboardChartPointDTO[];
        sessions_by_case?: QuestionnaireDashboardChartPointDTO[];
        cases_by_alert_level?: QuestionnaireDashboardChartPointDTO[];
        [key: string]: QuestionnaireDashboardChartPointDTO[] | undefined;
    } | null;
    cases?: QuestionnaireCaseV2DTO[];
    warnings?: string[];
    [key: string]: unknown;
}

export interface QuestionnairePsychologistDashboardV2Response {
    filters?: Record<string, unknown> | null;
    summary?: Record<string, unknown> | null;
    aggregates?: {
        by_domain?: QuestionnaireDashboardChartPointDTO[];
        by_alert_level?: QuestionnaireDashboardChartPointDTO[];
        by_review_status?: QuestionnaireDashboardChartPointDTO[];
        by_date?: QuestionnaireDashboardChartPointDTO[];
        by_case?: QuestionnaireDashboardChartPointDTO[];
        [key: string]: QuestionnaireDashboardChartPointDTO[] | undefined;
    } | null;
    charts?: {
        alerts_by_domain?: QuestionnaireDashboardChartPointDTO[];
        alerts_by_level?: QuestionnaireDashboardChartPointDTO[];
        reviews_by_status?: QuestionnaireDashboardChartPointDTO[];
        alerts_by_date?: QuestionnaireDashboardChartPointDTO[];
        cases_by_alert?: QuestionnaireDashboardChartPointDTO[];
        [key: string]: QuestionnaireDashboardChartPointDTO[] | undefined;
    } | null;
    items?: QuestionnaireHistoryItemV2DTO[];
    pagination?: PaginationDTO;
    warnings?: string[];
    [key: string]: unknown;
}

export interface QuestionnairePsychologistShareRequestV2DTO {
    grant_id: string;
    status?: string | null;
    case_id?: string | null;
    case_public_id?: string | null;
    case_display_label?: string | null;
    case_private_label?: string | null;
    latest_alert_level?: string | null;
    dominant_domain?: string | null;
    needs_professional_review?: boolean | null;
    created_at?: string | null;
    updated_at?: string | null;
    can_tag?: boolean | null;
    can_download_pdf?: boolean | null;
    [key: string]: unknown;
}

export interface QuestionnairePsychologistShareRequestsV2Response {
    items: QuestionnairePsychologistShareRequestV2DTO[];
    pagination: PaginationDTO;
    warnings?: string[];
    [key: string]: unknown;
}

export interface QuestionnaireNotificationV2DTO {
    notification_id: string;
    type?: string | null;
    title?: string | null;
    message?: string | null;
    is_read?: boolean | null;
    created_at?: string | null;
    [key: string]: unknown;
}

export interface QuestionnaireNotificationsV2Response {
    items: QuestionnaireNotificationV2DTO[];
    pagination?: PaginationDTO;
    [key: string]: unknown;
}

export interface QuestionnaireTagDTO {
    id?: string;
    tag_id?: string;
    label: string;
    tag?: string;
    color?: string | null;
    visibility?: QuestionnaireTagVisibility | null;
    visibility_label?: 'Privado' | 'Compartido' | '--';
    created_at?: string | null;
    updated_at?: string | null;
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
    shared_path?: string;
    shared_url?: string;
    url?: string;
    share_url?: string;
    public_url?: string;
    link?: string;
    expires_at?: string | null;
    max_uses?: number | null;
    uses?: number | null;
    [key: string]: unknown;
}

export interface QuestionnaireSharedSessionDTO {
    session_id: string;
    questionnaire_id: string;
    status: string;
    mode: FlexibleString<QuestionnaireV2Mode>;
    role: FlexibleString<QuestionnaireV2Role>;
    mode_key?: string;
    progress_pct?: number | null;
    version?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface QuestionnaireSharedResultDTO {
    summary?: string | null;
    operational_recommendation?: string | null;
    completion_quality_score?: number | null;
    missingness_score?: number | null;
    needs_professional_review?: boolean | null;
}

export interface QuestionnaireSharedDomainDTO {
    domain: string;
    probability?: number | null;
    alert_level?: string | null;
    confidence_pct?: number | null;
    confidence_band?: string | null;
    model_id?: string | null;
    model_version?: string | null;
    mode?: string | null;
    operational_class?: string | null;
    operational_caveat?: string | null;
    result_summary?: string | null;
    needs_professional_review?: boolean | null;
}

export interface QuestionnaireSharedComorbidityDTO {
    coexistence_key: string;
    domains: string[];
    combined_risk_score?: number | null;
    coexistence_level?: string | null;
    summary?: string | null;
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
    session: QuestionnaireSharedSessionDTO | null;
    result: QuestionnaireSharedResultDTO | null;
    domains: QuestionnaireSharedDomainDTO[];
    comorbidity: QuestionnaireSharedComorbidityDTO[];
    questionnaire_id?: string;
    share_code?: string;
    shared_url?: string;
    shared_path?: string;
    [key: string]: unknown;
}

export interface DownloadPdfResult {
    blob: Blob;
    filename: string;
}
